/**
 * SampleFormModal — **Buat Permintaan Sample** (pop-up 3 bagian, cermin modal Permintaan
 * Desain): (1) dari mana, (2) apa yang disampling — JENIS boleh lebih dari satu
 * (labdip + handfeel + proofing), (3) kapan.
 *
 * "Wajib kode desain" tidak ditebak layar: dibaca dari baris master (`requires_design`).
 */
import { useEffect, useMemo, useState } from "react";
import { Beaker, CalendarClock, ClipboardList, FlaskConical } from "lucide-react";
import FormModal from "../../components/FormModal";
import KNSelect from "../../components/KNSelect";
import KNDatePicker from "../../components/KNDatePicker";
import useCatalogMasters from "../../hooks/useCatalogMasters";
import axios, { API } from "../../services/apiClient";
import { createSample, listColors, listDesigns, listSpecs, sampleTypes } from "./rndApi";
import { errMsg, typeTone } from "./rndMeta";
import { typeLabel, typeMeta } from "./sampleTypeMeta";

// Daftar pesanan hidup DI SINI (bukan di rndApi.js) — modul bersama itu dipakai layar desainer.
const listOrders = (params) => axios.get(`${API}/sales-orders`, { params }).then((r) => r.data);

function Section({ icon: Icon, step, title, hint, children, testId }) {
  return (
    <section data-testid={testId} className="rounded-xl border border-[#EFF0F2] bg-[#FAFBFC] p-3">
      <div className="mb-2.5 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0058CC] text-[10.5px] font-bold text-white">{step}</span>
        <Icon size={13} className="text-[#0058CC]" />
        <div>
          <p className="text-[12px] font-bold text-[#1C1C1E]">{title}</p>
          {hint && <p className="text-[10.5px] text-[#8E8E93]">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export default function SampleFormModal({ selectedEntity, prefill, lockType = "", onClose, onSaved }) {
  const [specs, setSpecs] = useState([]);
  const [colors, setColors] = useState([]);
  const [designs, setDesigns] = useState([]);
  const [orders, setOrders] = useState([]);
  const [types, setTypes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [f, setF] = useState({
    spec_id: "",
    sample_types: prefill?.sample_types || (prefill?.sample_type ? [prefill.sample_type] : (lockType ? [lockType] : [])),
    title: "", brief: "",
    color_id: prefill?.color_id || "", design_id: prefill?.design_id || "",
    so_id: prefill?.so_id || "", line_code: prefill?.line_code || "",
    target_date: "", qty_requested: "3", unit: "meter",
  });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const masters = useCatalogMasters({ current: { base_unit: f.unit } });

  useEffect(() => {
    const params = selectedEntity && selectedEntity !== "all" ? { entity_id: selectedEntity } : {};
    listSpecs({ ...params, limit: 200 }).then((r) => setSpecs(r?.items || [])).catch(() => {});
    listColors().then((c) => setColors(Array.isArray(c) ? c : c?.items || [])).catch(() => {});
    listDesigns().then((d) => setDesigns(Array.isArray(d) ? d : d?.items || [])).catch(() => {});
    listOrders({ ...params, limit: 200 }).then((r) => setOrders(Array.isArray(r) ? r : r?.items || [])).catch(() => {});
  }, [selectedEntity]);

  useEffect(() => {
    const p = {};
    if (selectedEntity && selectedEntity !== "all") p.entity_id = selectedEntity;
    if (f.line_code) p.line = f.line_code;
    sampleTypes(p).then((rows) => setTypes(Array.isArray(rows) ? rows : [])).catch(() => {});
  }, [selectedEntity, f.line_code]);

  // Bawaan jenis: usulan spesifikasi, atau jawaban master atas "berangkat dari desain?".
  useEffect(() => {
    if (f.sample_types.length || types.length === 0) return;
    const spec = specs.find((x) => x.id === f.spec_id);
    const hint = spec?.sample_type_hint;
    if (hint && types.some((t) => t.value === hint)) { set("sample_types", [hint]); return; }
    if (prefill?.need_design !== undefined) {
      const hit = types.find((t) => Boolean(t.requires_design) === Boolean(prefill.need_design));
      if (hit) set("sample_types", [hit.value]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [types, f.spec_id]);

  const needDesign = useMemo(() => f.sample_types.some((c) => typeMeta(c, types).requires_design), [f.sample_types, types]);

  const pickSpec = (id) => {
    const s = specs.find((x) => x.id === id);
    setF((p) => ({
      ...p, spec_id: id,
      title: p.title || (s ? `Sampling ${s.title}` : ""),
      sample_types: p.sample_types.length ? p.sample_types : (s?.sample_type_hint ? [s.sample_type_hint] : []),
      color_id: s?.color_target?.color_id || p.color_id,
      design_id: s?.design_id || p.design_id,
      so_id: s?.so_id || p.so_id,
      line_code: s?.line_code || p.line_code,
      unit: s?.base_unit || p.unit,
    }));
  };
  const toggleType = (code) => setF((p) => ({
    ...p, sample_types: p.sample_types.includes(code) ? p.sample_types.filter((x) => x !== code) : [...p.sample_types, code],
  }));

  const titleOk = f.title.trim().length > 0;
  const typesOk = f.sample_types.length > 0;
  const designOk = !needDesign || !!f.design_id;

  const submit = async () => {
    setErr(""); setSaving(true);
    try {
      const created = await createSample({
        spec_id: f.spec_id, sample_types: f.sample_types, title: f.title, brief: f.brief,
        color_target: f.color_id ? { color_id: f.color_id } : {},
        design_id: f.design_id, so_id: f.so_id, line_code: f.line_code,
        target_date: f.target_date, qty_requested: f.qty_requested || 0, unit: f.unit,
      });
      onSaved?.(created);
    } catch (e) {
      setErr(errMsg(e, "Gagal membuat permintaan sample."));
      setSaving(false);
    }
  };

  const lockLabel = lockType ? typeLabel(lockType, types).split(" (")[0] : "";
  return (
    <FormModal open onClose={onClose} title={lockType ? `Sampel ${lockLabel} Baru` : "Permintaan Sample Baru"}
      subtitle={lockType ? `Jenis ${lockLabel} sudah terpilih — tulis brief untuk supplier, lalu tentukan target` : "Pilih jenis sampling (boleh lebih dari satu), tulis brief untuk supplier, lalu tentukan target"}
      icon={Beaker} size="lg" testId="sample-form-modal"
      onSubmit={submit} submitLabel="Simpan Permintaan" busy={saving} error={err}
      submitDisabled={!titleOk || !typesOk || !designOk} submitTestId="sample-form-save">
      <div className="grid gap-3">
        {prefill?.source_label && (
          <div className="rounded-lg bg-[#F2F7FF] px-3 py-2 text-[11.5px] text-[#004099]" data-testid="sample-form-prefill">
            Diisi otomatis dari <b>{prefill.source_label}</b>. Tinggal beri judul lalu simpan.
          </div>
        )}

        <Section step={1} icon={ClipboardList} title="Dari mana permintaan ini" hint="Semua opsional — spesifikasi mengisi warna/desain/pesanan otomatis." testId="sample-section-source">
          <div className="grid gap-2.5 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">Spesifikasi acuan</span>
              <KNSelect data-testid="sample-spec" className="field" value={f.spec_id} searchable
                options={[{ value: "", label: "— tanpa spesifikasi —" }, ...specs.map((s) => ({ value: s.id, label: `${s.number} · ${s.title}` }))]}
                onValueChange={pickSpec} />
            </label>
            <label className="block">
              <span className="field-label">Untuk pesanan pelanggan</span>
              <KNSelect data-testid="sample-so" className="field" value={f.so_id} searchable
                options={[{ value: "", label: "— bukan dari pesanan tertentu —" },
                  ...orders.map((o) => ({ value: o.id, label: `${o.order_number || o.number || o.id}${o.customer_name ? ` · ${o.customer_name}` : ""}` }))]}
                onValueChange={(v) => set("so_id", v)} />
            </label>
          </div>
        </Section>

        <Section step={2} icon={FlaskConical} title="Apa yang disampling"
          hint="Setiap jenis punya rangkaian round sendiri — hasilnya muncul di tab terpisah pada rincian." testId="sample-section-what">
          <div className="grid gap-2.5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <span className="field-label">Jenis sampling * (boleh lebih dari satu)</span>
              <div className="flex flex-wrap gap-1.5" data-testid="sample-type-picker">
                {types.length === 0 && (
                  <span className="text-[11.5px] text-[#8C4A00]" data-testid="sample-type-empty">
                    Belum ada jenis sampling aktif. Tambahkan di Pengaturan → Master → Jenis Sampling.
                  </span>
                )}
                {types.map((t) => {
                  const on = f.sample_types.includes(t.value);
                  const tone = typeTone(t.value);
                  const locked = lockType && t.value === lockType;
                  return (
                    <button key={t.value} type="button" data-testid={`sample-type-${t.value}`} onClick={() => { if (!locked) toggleType(t.value); }}
                      title={locked ? "Jenis utama tab ini — tidak bisa dilepas" : (t.notes || "")}
                      className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-[background-color,border-color,color] ${locked ? "cursor-default" : ""}`}
                      style={on ? { background: tone.fg, borderColor: tone.fg, color: "#fff" } : { background: "#fff", borderColor: "#E5E5EA", color: "#3C3C43" }}>
                      {t.label}{t.requires_design ? " · wajib desain" : ""}{locked ? " · utama" : ""}
                    </button>
                  );
                })}
              </div>
              {typesOk && (
                <p className="mt-1 text-[10.5px] text-[#6B6B73]" data-testid="sample-type-summary">
                  Dipilih: <b>{f.sample_types.map((c) => typeLabel(c, types)).join(" + ")}</b>. Hasil ukur:{" "}
                  {f.sample_types.map((c) => `${typeLabel(c, types).split(" (")[0]} → ${(typeMeta(c, types).measurement_fields || []).join(", ") || "foto + catatan"}`).join(" · ")}
                </p>
              )}
            </div>
            <label className="block sm:col-span-2">
              <span className="field-label">Judul permintaan *</span>
              <input className="field" data-testid="sample-title-input" value={f.title} onChange={(e) => set("title", e.target.value)}
                placeholder="mis. Labdip Katun Combed 150 gsm — biru dongker" />
            </label>
            <label className="block">
              <span className="field-label">Warna target</span>
              <KNSelect data-testid="sample-color" className="field" value={f.color_id} searchable
                options={[{ value: "", label: "— belum ditentukan —" }, ...colors.map((c) => ({ value: c.id, label: `${c.code} · ${c.name}` }))]}
                onValueChange={(v) => set("color_id", v)} />
            </label>
            <label className="block">
              <span className={`field-label ${needDesign && !f.design_id ? "text-[#A8221A]" : ""}`}>Desain / pattern{needDesign ? " * (wajib untuk jenis yang dipilih)" : ""}</span>
              <KNSelect data-testid="sample-design" className="field" value={f.design_id} searchable
                options={[{ value: "", label: "— tanpa desain —" }, ...designs.map((d) => ({ value: d.id, label: `${d.code || "tanpa kode"} · ${d.title} (v${d.version || 1})${d.on_hold ? " — ⛔ HOLD (tidak bisa proofing)" : ""}` }))]}
                onValueChange={(v) => set("design_id", v)} />
            </label>
            <label className="block">
              <span className="field-label">Jumlah diminta</span>
              <input className="field" type="number" min="0" step="any" inputMode="decimal" data-testid="sample-qty-input" value={f.qty_requested}
                onChange={(e) => set("qty_requested", e.target.value)} placeholder="3" />
            </label>
            <label className="block">
              <span className="field-label">Satuan</span>
              <KNSelect data-testid="sample-unit-input" className="field" value={f.unit} options={masters.unitOptions} onValueChange={(v) => set("unit", v)} />
            </label>
            <label className="block sm:col-span-2">
              <span className="field-label">Brief untuk supplier</span>
              <textarea className="field" rows={3} data-testid="sample-brief-input" value={f.brief} onChange={(e) => set("brief", e.target.value)}
                placeholder="mis. Cocokkan warna target maksimal ΔE 1.5, kirim swatch 3 meter" />
            </label>
          </div>
        </Section>

        <Section step={3} icon={CalendarClock} title="Kapan dibutuhkan" hint="Tenggat tiap round mengikuti SLA bila dikosongkan." testId="sample-section-when">
          <label className="block sm:w-1/2">
            <span className="field-label">Target tanggal selesai</span>
            <KNDatePicker data-testid="sample-target-date" value={f.target_date} onChange={(v) => set("target_date", v)} placeholder="Pilih tanggal" />
          </label>
        </Section>
      </div>
    </FormModal>
  );
}
