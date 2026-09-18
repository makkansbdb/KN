/** FinalPanel — tahap sesudah ACC: varian warna (N file, ditetapkan penilai) + mockup WAJIB (≥1). */
import { useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { patchDesign } from "../rndApi";
import { errMsg } from "../rndMeta";
import FilesPanel from "./FilesPanel";

export default function FinalPanel({ design, canEdit, canAssess, onDone, onError }) {
  const fin = design.final || {};
  const locked = !["approved", "final_submitted", "active"].includes(design.status);
  const [count, setCount] = useState(design.final_color_count || 4);
  const saveCount = async () => {
    try { await patchDesign(design.id, { final_color_count: Number(count) }); onDone?.("Jumlah varian warna final diperbarui."); }
    catch (e) { onError?.(errMsg(e, "Gagal menyimpan.")); }
  };
  const Row = ({ ok, text, testId }) => (
    <li className={`flex items-center gap-1.5 text-[11.5px] ${ok ? "text-[#1A7A3A]" : "text-[#6B6B73]"}`} data-testid={testId}>
      {ok ? <CheckCircle2 size={13} /> : <Circle size={13} />} {text}
    </li>
  );
  return (
    <div className="space-y-4" data-testid="design-final-panel">
      <div className="rounded-lg border border-[#EFF0F2] bg-[#FAFBFC] p-3">
        <p className="text-[10.5px] font-bold uppercase text-[#8E8E93]">Syarat berkas final (sesudah ACC)</p>
        <ul className="mt-1.5 space-y-1">
          <Row ok={fin.colorway_files >= fin.colorway_required} testId="design-final-check-colorway"
            text={`Varian warna: ${fin.colorway_files ?? 0} / ${fin.colorway_required ?? 4} file`} />
          <Row ok={(fin.mockup_files ?? 0) >= 1} testId="design-final-check-mockup"
            text={`Mockup hasil desain yang di-ACC: ${fin.mockup_files ?? 0} / 1 file (wajib)`} />
        </ul>
        {locked && <p className="mt-2 text-[10.5px] text-[#A05000]" data-testid="design-final-locked">Tahap ini terbuka setelah desain di-ACC penilai.</p>}
        {canAssess && (
          <div className="mt-2 flex items-center gap-2 text-[11px]">
            <span>Jumlah varian warna wajib:</span>
            <input type="number" min={1} max={20} className="field !w-16 !py-1" value={count} data-testid="design-final-count-input"
              onChange={(e) => setCount(e.target.value)} />
            <button className="secondary-button !py-1 text-[10.5px]" onClick={saveCount} data-testid="design-final-count-save">Simpan</button>
          </div>
        )}
      </div>
      <FilesPanel design={design} kind="colorway" canEdit={canEdit && !locked && design.status !== "active"} onDone={onDone} onError={onError} />
      <FilesPanel design={design} kind="mockup" canEdit={canEdit && !locked && design.status !== "active"} onDone={onDone} onError={onError} />
    </div>
  );
}
