/** FilesPanel — berkas berjenis: artwork (per ronde), foto referensi, varian warna final, mockup. */
import { Image as ImageIcon, Trash2, Upload } from "lucide-react";
import { deleteDesignFile, designFileUrl, uploadDesignKindFile } from "../rndApi";
import { errMsg, roundLabel } from "../rndMeta";

const KIND_META = {
  artwork: { label: "Berkas desain", hint: "hasil kerja ronde berjalan — boleh unggah 1–7 file sekaligus" },
  reference: { label: "Foto referensi", hint: "inspirasi / acuan dari pembuat desain" },
  colorway: { label: "Varian warna final", hint: "satu file per warna dari desain yang di-ACC" },
  mockup: { label: "Mockup", hint: "visual penerapan desain ACC di produk — WAJIB sebelum aktif" },
};

export default function FilesPanel({ design, kind, canEdit, onDone, onError }) {
  const meta = KIND_META[kind];
  const files = (design.files || []).filter((f) => (f.kind || "artwork") === kind);

  const uploadAll = async (list) => {
    let ok = 0;
    for (const file of list) {
      try { await uploadDesignKindFile(design.id, kind, file); ok += 1; }
      catch (e) { onError?.(errMsg(e, `Unggah "${file.name}" gagal.`)); }
    }
    if (ok) onDone?.(`${ok} ${meta.label.toLowerCase()} terunggah${kind === "artwork" ? ` pada ${roundLabel(design.version)}` : ""}.`);
  };

  return (
    <div data-testid={`design-files-${kind}`}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10.5px] text-[#6B6B73]"><b>{meta.label}</b> · {meta.hint} · {files.length} berkas</p>
        {canEdit && (
          <label className="secondary-button cursor-pointer !py-1 text-[11px]" data-testid={`design-upload-${kind}-label`}>
            <Upload size={12} /> Unggah {meta.label.toLowerCase()}
            <input type="file" className="hidden" accept={kind === "artwork" ? "image/*,.pdf" : "image/*"} multiple
              data-testid={`design-upload-${kind}`}
              onChange={(e) => { uploadAll(Array.from(e.target.files || [])); e.target.value = ""; }} />
          </label>
        )}
      </div>
      {files.length === 0 ? (
        <div className="flex h-24 flex-col items-center justify-center rounded-lg border border-dashed border-[#D9D9DE] text-[11px] text-[#9A9BA3]">
          <ImageIcon size={18} className="mb-1" /> belum ada {meta.label.toLowerCase()}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {files.map((f) => (
            <div key={f.id} className="group relative overflow-hidden rounded-lg border border-[#E5E5EA] bg-[#F5F5F7]" data-testid={`design-file-${f.id}`}>
              <a href={designFileUrl(design.id, f.id)} target="_blank" rel="noreferrer" className="block aspect-square">
                {f.content_type?.startsWith("image/")
                  ? <img src={designFileUrl(design.id, f.id)} alt={f.filename} className="h-full w-full object-cover" loading="lazy" />
                  : <span className="flex h-full items-center justify-center text-[10px] font-bold">PDF</span>}
              </a>
              {kind === "artwork" && (
                <span className="absolute left-1 top-1 rounded bg-white/90 px-1 py-0.5 text-[8.5px] font-bold text-[#6B219A]">{roundLabel(f.version || 1)}</span>
              )}
              <div className="px-1.5 py-1 text-[9.5px] leading-tight">
                <p className="truncate font-semibold" title={f.filename}>{f.filename}</p>
                <p className="text-[#8E8E93]">{f.uploaded_by || ""}</p>
              </div>
              {canEdit && (
                <button className="absolute right-1 top-1 hidden rounded bg-white/90 p-1 text-red-500 shadow group-hover:block"
                  data-testid={`design-file-delete-${f.id}`} title="Hapus berkas"
                  onClick={() => deleteDesignFile(design.id, f.id).then(() => onDone?.("Berkas dihapus.")).catch((e) => onError?.(errMsg(e)))}>
                  <Trash2 size={11} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
