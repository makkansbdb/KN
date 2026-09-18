# PRD — Kain Nusantara ERP (lanjutan dari repo github.com/kakjsbsbs/KN)

## Problem statement (asli, 2026-09-17)
Lanjutkan development repo KN. Fitur dispatch/pengiriman masih sangat basic: tidak ada quick action di dasbor
(hanya list yang harus buat dispatch), belum ada history pengiriman, visualisasi status pengiriman yang sedang
diproses, ketersediaan armada internal, jenis pengiriman (kurir pihak ketiga dll). Pertanyaan: bagaimana fitur
customer ambil sendiri & validasinya? Data pengiriman (alamat kirim) masih bocor/terekspos pada SO yang ambil sendiri.

## Pilihan user
- Bangun semua sekaligus: dasbor dispatch + quick action, visualisasi status, ketersediaan armada, jenis pengiriman
  (internal / kurir pihak ketiga / ambil sendiri), history.
- Ambil sendiri: kode pickup unik + verifikasi identitas pengambil (nama + no. ID), tanpa driver/armada/alamat kirim.
- Kurir pihak ketiga: nama kurir, no. resi, biaya kirim, estimasi tiba.
- Armada: master kendaraan + driver dengan status (tersedia / dalam perjalanan / perawatan), status berubah otomatis.

## Arsitektur (yang disentuh)
- Backend FastAPI: `services/logistics_service.py` (moda self_pickup, kode pickup, handover, dashboard, history, redaksi kode),
  `services/fleet_service.py` (baru — master kendaraan `fleet_vehicles`, status sopir turunan), `routers/logistics.py`
  (endpoint baru), `schemas_logistics.py`, `entity_scope.py` (+fleet_vehicles scoped), `services/so_verify_service.py`
  (anti-bocor alamat pada SO ambil).
- Frontend React: `features/logistics/` → `LogisticsView` (tab Dasbor/Daftar/Riwayat/Armada), `DispatchDashboard`,
  `HistoryPanel`, `FleetPanel`, `PickupHandoverPanel`, `DeliveryCreateModal` (moda otomatis dari metode pemenuhan SO),
  `DeliveryDetailModal` (cabang pickup), `sales_admin/OrderPreviewCard` (sembunyikan alamat untuk SO ambil).
- Frontend TIDAK hot-reload: `setsid nohup bash /app/scripts/rebuild_frontend.sh > /app/.rebuild.out 2>&1 &`.
- Env: backend/.env CORS_ORIGINS harus daftar origin eksplisit (bukan `*`).

## Persona
Admin gudang / manajer (buat & kelola pengiriman, armada), petugas gudang (serah terima pickup), sopir (tugas hari ini),
sales / admin sales (pantau, bagikan kode pickup ke pelanggan).

## Sudah diimplementasikan (2026-09-17)
- Dasbor Pengiriman: KPI (SJ menunggu, menunggu diambil, diproses, di jalan, ETA hari ini, terlambat, terkirim hari ini),
  aksi cepat per SJ (Buat pengiriman / Siapkan pickup), antrean serah terima pickup, alur status (bar), moda (donut),
  ringkasan armada, daftar sedang diproses, baru selesai/gagal.
- Jenis pengiriman: Ekspedisi (kurir, resi, layanan, biaya kirim, ETA) · Armada sendiri (kendaraan master + sopir) ·
  Diambil pelanggan (kode pickup 6 karakter, tanggal ambil).
- Validasi ambil sendiri: SO `fulfillment_method=ambil` wajib moda self_pickup (dan sebaliknya ditolak); tidak ada
  alamat/plat/sopir; tahapan hanya lewat POST pickup-handover (kode cocok + nama pengambil [+ no. ID]); kode salah
  ditolak & dihitung; kode disembunyikan dari peran gudang/sopir (mereka mencocokkan kode yang disebut pengambil).
- Anti-bocor: `shipments/unassigned` & `order_preview` tidak mengirim alamat kirim untuk SO ambil.
- Riwayat: filter tanggal/moda/status/kata kunci, statistik (terkirim, gagal, rata-rata hari, total biaya ekspedisi), CSV.
- Armada: CRUD kendaraan, perawatan ⇄ tersedia, otomatis on_trip saat berangkat & lepas saat tiba/gagal/selesai,
  status sopir turunan dari pengiriman aktif; kendaraan maintenance/on_trip tak bisa dipilih.
- Seed demo: `scripts/seed_dispatch_demo.py`; smoke API: `scripts/smoke_dispatch.sh`.

## Setup ulang 2026-09-18 (repo nakisbdvsb/KN)
- Repo di-overlay ke /app (`.env` dipertahankan; CORS_ORIGINS diisi origin preview eksplisit — wajib, server menolak `*`).
- pip: filter baris `emergentintegrations`/`litellm` (konflik pin; sudah ada di base image). FE: `yarn install --frozen-lockfile` + `bash scripts/rebuild_frontend.sh`.
- Seed: `python seed_realistic.py` → `scripts/seed_dispatch_demo.py` → `backfill_po_payment_due.py` → `seed_endek_showcase.py` → `seed_design_scores_demo.py`.
- Verifikasi: `/api/logistics/dashboard` mengembalikan 5 pengiriman demo; UI Dasbor Pengiriman render (screenshot).
- Temuan kecil: `OrderJourneyPanel` menampilkan "Armada sendiri" untuk moda self_pickup (belum ada cabang pickup) → masuk P1 di bawah.

## Sinkron Permintaan Desain ↔ Design Studio (2026-09-18)
- Permintaan Desain kini memakai master kategori yang SAMA dengan Design Studio (Kategori Pattern + Kategori Design)
  menggantikan `target_type` legacy (tetap diterima API). Modal buat permintaan 3 bagian (sumber · apa · siapa/kapan).
- Desainer: dari detail permintaan → "Buat & buka desain" (`POST /design-requests/{id}/create-design`: desain Studio dibuat
  dengan kode otomatis, brief/kategori/lini ikut, tertaut dua arah `request_id`, permintaan → Dikerjakan) atau "Tautkan
  yang sudah ada" (`/link-design`; hanya desain berjalan & belum tertaut).
- Status permintaan MENGIKUTI siklus hidup desain (`design_studio_service.transition` → `sync_from_design`):
  submit → Menunggu keputusan · request_revision → Minta revisi (+revision_count, alasan) · approve → ACC.
  approve/reject langsung di permintaan yang tertaut Studio ditolak 400 (keputusan + nilai di halaman desain).
- UI: detail 2 kolom (brief, desain tertaut dengan cover/status/nilai, riwayat | fakta, tindakan), stepper status,
  kartu papan menampilkan kategori, pelanggan/SO, kode & status desain, desainer, tenggat. Deep-link `openRnd({view:"rnd-designs", designId})`
  → `RndDesignsView` prop `focus`. Halaman desain menampilkan chip "Dari permintaan …".
- Seed `seed_design_requests()` memakai alur sinkron. Uji: `backend/tests/test_iter319_dsr_studio_sync.py` (9/9), iteration_28.

## Galeri Referensi Brief (2026-09-18)
- `design_requests.references[]` (storage scope `design_requests`): POST/GET/DELETE `/design-requests/{id}/references[/{fid}]`
  (unggah/hapus izin `design_request.create` = pembuat permintaan; hanya gambar; status belum ACC/batal).
- `_propagate_references` menyalin ke desain tertaut sebagai berkas `kind=reference` (penanda `source_reference_id`, idempoten)
  saat create-design / link-design dan saat referensi baru ditambah setelah tertaut.
- UI: `ReferenceGallery.jsx` — pratinjau lokal di modal buat (diunggah setelah permintaan tercipta), galeri + unggah/hapus di
  detail, thumbnail kecil di kartu papan.

## Permintaan Sample R&D — UI baru cermin alur Desainer (2026-09-18)
- Setup ulang dari repo gatadadavaoa/KN (overlay ke /app, .env dipertahankan, CORS eksplisit, seed `seed_realistic.py`).
- Pilihan user: satu papan "Permintaan Sample" + rincian bergaya Studio dengan 3 TAB terpisah Labdip / Handfeel / Proofing;
  pembuat admin/manager/MD/sales; pengerja role MD (custom role & access diperbaiki nanti). Mekanisme server TIDAK diubah.
- Frontend `features/rnd/`: `RndSamplesView` (KPI, tab Papan/Daftar, chip jenis & status, kolom draft→decided,
  `SampleBoardCard`), `SampleFormModal` (FormModal 3 bagian bernomor: dari mana · apa yang disampling · kapan),
  `SampleDetailPanel` (DetailModal framed, kepala + stepper, 2 kolom, aksi kanan), `SampleTypeTabs` (tab per jenis,
  jenis yang belum diminta → tombol tambah via PATCH sample_types), `SampleRoundList` (+prop `onlyType`).
- `hubTabs`: rnd-samples kini juga untuk `md` & `sales_admin`. `navMeta` judul diperbarui.
- Testing agent iterasi 29: backend 5/5, frontend 100% (papan, filter, buat, tab jenis, kirim, batal, role MD).

## Galeri Bukti Per Tab (2026-09-18)
- `features/rnd/SampleProofGallery.jsx` (kolom per supplier, thumbnail tiap round dgn lencana R<n> & titik hasil, lightbox
  prev/next/Esc) + `ProofImage.jsx` (muat bukti via axios blob agar header Authorization/X-Entity-Id ikut; cache object URL).
- Dipasang di `SampleTypeTabs` setelah tabel perbandingan, hanya untuk jenis yang diminta. Testing agent iterasi 30: 100%.

## Tab per Jenis di hub R&D — Labdip / Handfeel / Proofing (Master) (2026-09-18)
- View baru `rnd-labdip`, `rnd-handfeel`, `rnd-proofing` → `features/rnd/SampleTypeGalleryView.jsx` (+ `SampleTypeCard.jsx`),
  cermin "Desain & Pattern (Master)": KPI, cari + saringan (status/supplier/hasil/skor/ronde/bukti), grid kartu bersampul
  foto bukti, tombol "Sampel <Jenis> Baru" (SampleFormModal `lockType`), klik kartu → rincian dengan tab jenis aktif
  (`initialType`). Dibatalkan disembunyikan kecuali difilter. Terdaftar di hubTabs/navMeta/roles/AppViewRouter.
- Testing agent iterasi 31: frontend 100% (MD + admin, buat dari tab, filter, regresi papan & desain).

### 2026-06 — Peran & Hak Akses (custom role, 3 tingkat per modul)
- Backend: `access_modules.py` (katalog 24 modul: label/deskripsi/resources/nav, `apply_levels`, `nav_for_levels`),
  `services/custom_role_service.py` (buat/ubah/hapus/reset; peran kustom tersimpan di `custom_roles`, matriks izin di
  `permission_settings.matrix`; registry `role_registry.register_custom_roles` disinkron saat start & tiap perubahan),
  router `/api/access/modules|roles` (izin permission.view/update). Admin dikunci; bawaan tidak bisa dihapus/ganti nama.
- Frontend: tab **Peran & Hak Akses** di Badan Usaha & Akses (`RoleAccessPanel`, `RoleEditorDrawer`, `RoleModuleRow`,
  `RoleMenuPreview`): kartu peran + jumlah akun, segmented 3 tingkat per modul, salin dari peran, semua-modul cepat,
  pratinjau menu nyata (buildNavGroups dgn overlay `__preview`), dialog konfirmasi perubahan, peringatan modul sensitif.
- `roles.js`: `registerDynamicRoles` (registry/ROLE_NAV/ROLE_HOME dinamis, ROLE_OPTIONS ikut → formulir akun),
  `roleCanSee` rekursif inherit. `App.js`: poll `/api/roles` + `/auth/me` tiap 60 dtk + event `kn:roles-changed`.
- Testing agent iterasi 32: backend 14/14, frontend 100%.
- Catatan lingkungan: frontend dilayani bundle statis → `bash scripts/rebuild_frontend.sh` setelah ubah src;
  backend/.env butuh CORS_ORIGINS eksplisit (bukan `*`).

### 2026-06 — Notifikasi sinkron dengan Peran & Hak Akses (iterasi 33)
- `services/notification_scope.py`: filter kotak notifikasi = audiens (peran/all/peran acuan/recipient_user) ∧ relevansi
  (link layar tujuan harus boleh dibuka: modul ≥ Lihat). Admin melihat SEMUA notifikasi kecuali yang ditujukan langsung
  (`recipient_user`) ke orang lain — perbaikan dari temuan iterasi 33 (sebelumnya admin hanya audiens admin/all).
- `services/turn_notification_service.py`: penerima "Giliran Anda" digerbang izin dari matriks (peran bawaan + kustom),
  admin/manager dikecualikan kecuali rule menyebutnya. `GET /api/access/roles/{id}` → `turn_alerts`; editor peran
  menampilkan `role-editor-turn-alerts`.
- Setup ulang env baru (2026-06): clone repo pandeyoga/KNHOST; peran kustom `cr_staf_penagihan` + akun penagihan@
  dibuat ulang via API (finance, accounting=view, ar=manage). Pytest `tests/test_notifications_iter33.py` 10/10 lulus.


### 2026-06 — Editor peran: pratinjau notifikasi live, duplikat peran, pindah akun massal
- Backend: `POST /api/access/roles/preview` (turn_alerts & screens dari tingkat yang belum disimpan),
  `POST /api/access/roles/{id}/move-users` (pindah semua akun ke peran lain; admin ditolak). Audit `role_users_moved`.
- Frontend: `RoleNotifPreview` (diff vs tersimpan: "(baru)"/"(hilang)"), tombol `role-card-duplicate-<id>` → editor
  mode duplikat (acuan = peran sumber; hanya modul yang diubah dikirim agar izin parsial tetap setia), panel pindah akun di
  `RoleAccountsList` dengan `RoleDangerDialog` kind "move"; editor tetap terbuka & disegarkan setelah pindah.
- Testing agent iterasi 37: backend 11/11, frontend 100%.

## Backlog
- P2 (Akses): ganti `window.confirm` hapus/reset peran dengan modal in-app — SELESAI 2026-06 (`RoleDangerDialog`).
- P2 (Akses): daftar akun pemakai peran di editor — SELESAI 2026-06 (`RoleAccountsList`, `accounts[]` di GET /api/access/roles/{id}).
- P2 (Akses): router tuple peran hardcoded mengenal peran kustom — SELESAI 2026-06 (`role_registry.role_in` di design_requests, internal_requests, rnd, rnd_org, dan `dependencies.require_role`; frontend `roleIs` di rnd/design/designer views; deep-link `?view=` untuk peran `cr_*` menunggu registrasi peran kustom). Testing agent iterasi 35–36: backend 100%, frontend 100%.
- P2 (RND): revoke object URL cache galeri bukti (LRU) untuk sesi panjang; kolom galeri responsif di layar sempit.
- P1 (RND): sticky footer/ringkasan aksi di rincian sample; skeleton KPI saat memuat (kilat 0 ~200ms).
- P1 (RND): testid per-supplier di `SampleSendModal` (`sample-send-supplier-<id>`); galeri foto bukti per tab jenis.
- P1 (RND): perbaikan custom role & access — SELESAI 2026-06 (lihat bagian Peran & Hak Akses).
- P1: notifikasi WA otomatis kode pickup ke pelanggan saat pengiriman pickup dibuat (sekarang tombol WA manual).
- P1: kadaluarsa kode pickup / regenerasi kode oleh admin; batas percobaan kode salah → kunci sementara.
- P1: tampilkan badge moda & kode pickup di Perjalanan Pesanan (OrderJourneyPanel) dan Meja Admin Gudang.
- P2: biaya kirim ekspedisi → jurnal beban pengiriman (GL) / tagihan ke pelanggan.
- P2: jadwal kendaraan (kalender), riwayat perawatan, KM.
- P2: peta posisi live untuk semua pengiriman aktif di dasbor.
