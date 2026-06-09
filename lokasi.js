// ─── DAFTAR LOKASI INDONESIA ───
// Dipakai untuk autocomplete input lokasi kegiatan.
const DAFTAR_LOKASI = ["Ambon","Balikpapan","Banda Aceh","Bandar Lampung","Bandung","Banjar","Banjarbaru","Banjarmasin","Batam","Batu","Baubau","Bekasi","Bengkulu","Bima","Binjai","Bitung","Blitar","Bogor","Bontang","Bukittinggi","Cilegon","Cimahi","Cirebon","Denpasar","Depok","Dumai","Gorontalo","Gunungsitoli","Jakarta Barat","Jakarta Pusat","Jakarta Selatan","Jakarta Timur","Jakarta Utara","Jambi","Jayapura","Kediri","Kendari","Kotamobagu","Kupang","Langsa","Lhokseumawe","Lubuk Linggau","Madiun","Magelang","Makassar","Malang","Manado","Mataram","Medan","Metro","Mojokerto","Padang","Padang Panjang","Padang Sidimpuan","Pagar Alam","Palangka Raya","Palembang","Palopo","Palu","Pangkalpinang","Parepare","Pariaman","Pasuruan","Payakumbuh","Pekalongan","Pekanbaru","Pematangsiantar","Pontianak","Prabumulih","Probolinggo","Sabang","Salatiga","Samarinda","Sawah Lunto","Semarang","Serang","Sibolga","Singkawang","Solok","Sorong","Subulussalam","Sukabumi","Sungai Penuh","Surabaya","Surakarta","Tangerang","Tangerang Selatan","Tanjung Balai","Tanjungpinang","Tarakan","Tasikmalaya","Tebing Tinggi","Tegal","Ternate","Tidore Kepulauan","Tomohon","Tual","Yogyakarta","Kabupaten Aceh Barat","Kabupaten Aceh Barat Daya","Kabupaten Aceh Besar","Kabupaten Aceh Jaya","Kabupaten Aceh Selatan","Kabupaten Aceh Singkil","Kabupaten Aceh Tamiang","Kabupaten Aceh Tengah","Kabupaten Aceh Tenggara","Kabupaten Aceh Timur","Kabupaten Aceh Utara","Kabupaten Agam","Kabupaten Alor","Kabupaten Asahan","Kabupaten Asmat","Kabupaten Badung","Kabupaten Balangan","Kabupaten Bandung","Kabupaten Bandung Barat","Kabupaten Banggai","Kabupaten Banggai Kepulauan","Kabupaten Banggai Laut","Kabupaten Bangka","Kabupaten Bangka Barat","Kabupaten Bangka Selatan","Kabupaten Bangka Tengah","Kabupaten Bangkalan","Kabupaten Bangli","Kabupaten Banjar","Kabupaten Banjarnegara","Kabupaten Bantaeng","Kabupaten Bantul","Kabupaten Banyuasin","Kabupaten Banyumas","Kabupaten Banyuwangi","Kabupaten Barito Kuala","Kabupaten Barito Selatan","Kabupaten Barito Timur","Kabupaten Barito Utara","Kabupaten Barru","Kabupaten Batang","Kabupaten Batang Hari","Kabupaten Batubara","Kabupaten Bekasi","Kabupaten Belitung","Kabupaten Belitung Timur","Kabupaten Belu","Kabupaten Bener Meriah","Kabupaten Bengkalis","Kabupaten Bengkayang","Kabupaten Bengkulu Selatan","Kabupaten Bengkulu Tengah","Kabupaten Bengkulu Utara","Kabupaten Berau","Kabupaten Biak Numfor","Kabupaten Bima","Kabupaten Bintan","Kabupaten Bireuen","Kabupaten Blitar","Kabupaten Blora","Kabupaten Boalemo","Kabupaten Bogor","Kabupaten Bojonegoro","Kabupaten Bolaang Mongondow","Kabupaten Bolaang Mongondow Selatan","Kabupaten Bolaang Mongondow Timur","Kabupaten Bolaang Mongondow Utara","Kabupaten Bombana","Kabupaten Bondowoso","Kabupaten Bone","Kabupaten Bone Bolango","Kabupaten Boven Digoel","Kabupaten Boyolali","Kabupaten Brebes","Kabupaten Buleleng","Kabupaten Bulukumba","Kabupaten Bulungan","Kabupaten Bungo","Kabupaten Buol","Kabupaten Buru","Kabupaten Buru Selatan","Kabupaten Buton","Kabupaten Buton Selatan","Kabupaten Buton Tengah","Kabupaten Buton Utara","Kabupaten Ciamis","Kabupaten Cianjur","Kabupaten Cilacap","Kabupaten Cirebon","Kabupaten Dairi","Kabupaten Deiyai","Kabupaten Deli Serdang","Kabupaten Demak","Kabupaten Dharmasraya","Kabupaten Dogiyai","Kabupaten Dompu","Kabupaten Donggala","Kabupaten Empat Lawang","Kabupaten Ende","Kabupaten Enrekang","Kabupaten Fak-Fak","Kabupaten Flores Timur","Kabupaten Garut","Kabupaten Gayo Lues","Kabupaten Gianyar","Kabupaten Gorontalo","Kabupaten Gorontalo Utara","Kabupaten Gowa","Kabupaten Gresik","Kabupaten Grobogan","Kabupaten Gunung Kidul","Kabupaten Gunung Mas","Kabupaten Halmahera Barat","Kabupaten Halmahera Selatan","Kabupaten Halmahera Tengah","Kabupaten Halmahera Timur","Kabupaten Halmahera Utara","Kabupaten Hulu Sungai Selatan","Kabupaten Hulu Sungai Tengah","Kabupaten Hulu Sungai Utara","Kabupaten Humbang Hasudutan","Kabupaten Indragiri Hilir","Kabupaten Indragiri Hulu","Kabupaten Indramayu","Kabupaten Intan Jaya","Kabupaten Jayapura","Kabupaten Jayawijaya","Kabupaten Jember","Kabupaten Jembrana","Kabupaten Jeneponto","Kabupaten Jepara","Kabupaten Jombang","Kabupaten Kaimana","Kabupaten Kampar","Kabupaten Kapuas","Kabupaten Kapuas Hulu","Kabupaten Karang Asem","Kabupaten Karanganyar","Kabupaten Karawang","Kabupaten Karimun","Kabupaten Karo","Kabupaten Katingan","Kabupaten Kaur","Kabupaten Kayong Utara","Kabupaten Kebumen","Kabupaten Kediri","Kabupaten Keerom","Kabupaten Kendal","Kabupaten Kep. Sangihe","Kabupaten Kepahiang","Kabupaten Kepulauan Anambas","Kabupaten Kepulauan Aru","Kabupaten Kepulauan Mentawai","Kabupaten Kepulauan Meranti","Kabupaten Kepulauan Morotai","Kabupaten Kepulauan Selayar","Kabupaten Kepulauan Seribu","Kabupaten Kepulauan Siau Tagulandang Biaro","Kabupaten Kepulauan Sula","Kabupaten Kepulauan Talaud","Kabupaten Kepulauan Tanimbar","Kabupaten Kepulauan Yapen","Kabupaten Kerinci","Kabupaten Ketapang","Kabupaten Klaten","Kabupaten Klungkung","Kabupaten Kolaka","Kabupaten Kolaka Timur","Kabupaten Kolaka Utara","Kabupaten Konawe","Kabupaten Konawe Kepulauan","Kabupaten Konawe Selatan","Kabupaten Konawe Utara","Kabupaten Kotabaru","Kabupaten Kotawaringin Barat","Kabupaten Kotawaringin Timur","Kabupaten Kuantan Singingi","Kabupaten Kuburaya","Kabupaten Kudus","Kabupaten Kulon Progo","Kabupaten Kuningan","Kabupaten Kupang","Kabupaten Kutai Barat","Kabupaten Kutai Kartanegara","Kabupaten Kutai Timur","Kabupaten Labuhanbatu","Kabupaten Labuhanbatu Selatan","Kabupaten Labuhanbatu Utara","Kabupaten Lahat","Kabupaten Lamandau","Kabupaten Lamongan","Kabupaten Lampung Barat","Kabupaten Lampung Selatan","Kabupaten Lampung Tengah","Kabupaten Lampung Timur","Kabupaten Lampung Utara","Kabupaten Landak","Kabupaten Langkat","Kabupaten Lanny Jaya","Kabupaten Lebak","Kabupaten Lebong","Kabupaten Lembata","Kabupaten Lima Puluh Koto","Kabupaten Lingga","Kabupaten Lombok Barat","Kabupaten Lombok Tengah","Kabupaten Lombok Timur","Kabupaten Lombok Utara","Kabupaten Lumajang","Kabupaten Luwu","Kabupaten Luwu Timur","Kabupaten Luwu Utara","Kabupaten Madiun","Kabupaten Magelang","Kabupaten Magetan","Kabupaten Mahakam Ulu","Kabupaten Majalengka","Kabupaten Majene","Kabupaten Malaka","Kabupaten Malang","Kabupaten Malinau","Kabupaten Maluku Barat Daya","Kabupaten Maluku Tengah","Kabupaten Maluku Tenggara","Kabupaten Mamasa","Kabupaten Mamuju","Kabupaten Mamuju Tengah","Kabupaten Mandailing Natal","Kabupaten Manggarai","Kabupaten Manggarai Barat","Kabupaten Manggarai Timur","Kabupaten Manokwari","Kabupaten Manokwari Selatan","Kabupaten Mappi","Kabupaten Maros","Kabupaten Maybrat","Kabupaten Melawi","Kabupaten Memberamo Raya","Kabupaten Membramo Tengah","Kabupaten Mempawah","Kabupaten Merangin","Kabupaten Merauke","Kabupaten Mesuji","Kabupaten Mimika","Kabupaten Minahasa","Kabupaten Minahasa Selatan","Kabupaten Minahasa Tenggara","Kabupaten Minahasa Utara","Kabupaten Mojokerto","Kabupaten Morowali","Kabupaten Morowali Utara","Kabupaten Muara Enim","Kabupaten Muaro Jambi","Kabupaten Muko-muko","Kabupaten Muna","Kabupaten Muna Barat","Kabupaten Murung Raya","Kabupaten Musi Banyuasin","Kabupaten Musi Rawas","Kabupaten Musi Rawas Utara","Kabupaten Nabire","Kabupaten Nagakeo","Kabupaten Nagan Raya","Kabupaten Natuna","Kabupaten Nduga","Kabupaten Ngada","Kabupaten Nganjuk","Kabupaten Ngawi","Kabupaten Nias","Kabupaten Nias Barat","Kabupaten Nias Selatan","Kabupaten Nias Utara","Kabupaten Nunukan","Kabupaten Ogan Ilir","Kabupaten Ogan Komering Ilir","Kabupaten Ogan Komering Ulu","Kabupaten Ogan Komering Ulu Selatan","Kabupaten Ogan Komering Ulu Timur","Kabupaten Pacitan","Kabupaten Padang Lawas","Kabupaten Padang Lawas utara","Kabupaten Padang Pariaman","Kabupaten Pakpak Bharat","Kabupaten Pamekasan","Kabupaten Pandeglang","Kabupaten Pangandaran","Kabupaten Pangkajene Kepulauan","Kabupaten Paniai","Kabupaten Parigi Moutong","Kabupaten Pasaman","Kabupaten Pasaman Barat","Kabupaten Pasangkayu","Kabupaten Paser","Kabupaten Pasuruan","Kabupaten Pati","Kabupaten Pegunungan Arfak","Kabupaten Pegunungan Bintang","Kabupaten Pekalongan","Kabupaten Pelalawan","Kabupaten Pemalang","Kabupaten Penajam Paser Utara","Kabupaten Penukal Abab Lematang Ilir","Kabupaten Pesawaran","Kabupaten Pesisir Barat","Kabupaten Pesisir Selatan","Kabupaten Pidie","Kabupaten Pidie Jaya","Kabupaten Pinrang","Kabupaten Pohuwato","Kabupaten Polewali Mandar","Kabupaten Ponorogo","Kabupaten Poso","Kabupaten Pringsewu","Kabupaten Probolinggo","Kabupaten Pulang Pisau","Kabupaten Pulau Taliabu","Kabupaten Puncak","Kabupaten Puncak Jaya","Kabupaten Purbalingga","Kabupaten Purwakarta","Kabupaten Purworejo","Kabupaten Raja Ampat","Kabupaten Rejang Lebong","Kabupaten Rembang","Kabupaten Rokan Hilir","Kabupaten Rokan Hulu","Kabupaten Rote-Ndao","Kabupaten Sabu Raijua","Kabupaten Sambas","Kabupaten Samosir","Kabupaten Sampang","Kabupaten Sanggau","Kabupaten Sarolangun","Kabupaten Sarmi","Kabupaten Sekadau","Kabupaten Seluma","Kabupaten Semarang","Kabupaten Serang","Kabupaten Serdang Bedagai","Kabupaten Seram Bagian Barat","Kabupaten Seram Bagian Timur","Kabupaten Seruyan","Kabupaten Siak","Kabupaten Sidenreng Rappang","Kabupaten Sijunjung","Kabupaten Sikka","Kabupaten Simalungun","Kabupaten Simeulue","Kabupaten Sinjai","Kabupaten Sintang","Kabupaten Situbondo","Kabupaten Sleman","Kabupaten Solok","Kabupaten Solok Selatan","Kabupaten Soppeng","Kabupaten Sorong","Kabupaten Sorong Selatan","Kabupaten Sragen","Kabupaten Subang","Kabupaten Sukabumi","Kabupaten Sukamara","Kabupaten Sukoharjo","Kabupaten Sumba Barat","Kabupaten Sumba Barat Daya","Kabupaten Sumba Tengah","Kabupaten Sumba Timur","Kabupaten Sumbawa","Kabupaten Sumbawa Barat","Kabupaten Sumedang","Kabupaten Sumenep","Kabupaten Supiori","Kabupaten Tabalong","Kabupaten Tabanan","Kabupaten Takalar","Kabupaten Tambrauw","Kabupaten Tana Tidung","Kabupaten Tana Toraja","Kabupaten Tanah Bumbu","Kabupaten Tanah Datar","Kabupaten Tanah Laut","Kabupaten Tangerang","Kabupaten Tanggamus","Kabupaten Tanjung Jabung Barat","Kabupaten Tanjung Jabung Timur","Kabupaten Tapanuli Selatan","Kabupaten Tapanuli Tengah","Kabupaten Tapanuli Utara","Kabupaten Tapin","Kabupaten Tasikmalaya","Kabupaten Tebo","Kabupaten Tegal","Kabupaten Teluk Bintuni","Kabupaten Teluk Wondama","Kabupaten Temanggung","Kabupaten Timor Tengah Selatan","Kabupaten Timor Tengah Utara","Kabupaten Toba","Kabupaten Tojo Una-Una","Kabupaten Tolikara","Kabupaten Tolitoli","Kabupaten Toraja Utara","Kabupaten Trenggalek","Kabupaten Tuban","Kabupaten Tulang Bawang","Kabupaten Tulang Bawang Barat","Kabupaten Tulungagung","Kabupaten Wakatobi","Kabupaten Wajo","Kabupaten Waropen","Kabupaten Way Kanan","Kabupaten Wonogiri","Kabupaten Wonosobo","Kabupaten Yahukimo","Kabupaten Yalimo"];

// ─── STATE AUTOCOMPLETE ───
let _lokasiValid = false;
let _lokasiSuggestIndex = -1;
let _editLokasiValid = false;
let _editLokasiSuggestIndex = -1;

// ─── SUGGEST (form tambah) ───
function filterLokasiSuggest(inp) {
  const q = inp.value.trim().toLowerCase();
  const box = document.getElementById('lokasiSuggestBox');
  _lokasiValid = false; _lokasiSuggestIndex = -1;
  if (!q) { box.style.display = 'none'; return; }
  const matches = DAFTAR_LOKASI.filter(l => l.toLowerCase().includes(q)).slice(0, 20);
  if (!matches.length) {
    box.innerHTML = '<div class="lokasi-suggest-empty">Tidak ditemukan dalam daftar</div>';
    box.style.display = 'block'; return;
  }
  box.innerHTML = matches.map(l => {
    const v = l.replace(/'/g, "\\'");
    return `<div class="lokasi-suggest-item" data-val="${escHtml(l)}" onmousedown="pilihLokasi('${v}')">${escHtml(l)}</div>`;
  }).join('');
  box.style.display = 'block';
}

function pilihLokasi(val) {
  const inp = document.getElementById('inputLokasi');
  inp.value = val; _lokasiValid = true;
  document.getElementById('lokasiSuggestBox').style.display = 'none';
  inp.classList.remove('error');
}

function validateLokasi(inp) {
  setTimeout(() => {
    document.getElementById('lokasiSuggestBox').style.display = 'none';
    const val = inp.value.trim();
    const exact = DAFTAR_LOKASI.find(l => l.toLowerCase() === val.toLowerCase());
    if (exact) { inp.value = exact; _lokasiValid = true; inp.classList.remove('error'); }
    else { _lokasiValid = false; if (val) inp.classList.add('error'); }
  }, 150);
}

// ─── SUGGEST (form edit) ───
function filterLokasiSuggestEdit(inp) {
  const q = inp.value.trim().toLowerCase();
  const box = document.getElementById('lokasiSuggestBoxEdit');
  _editLokasiValid = false; _editLokasiSuggestIndex = -1;
  if (!q) { box.style.display = 'none'; return; }
  const matches = DAFTAR_LOKASI.filter(l => l.toLowerCase().includes(q)).slice(0, 20);
  if (!matches.length) {
    box.innerHTML = '<div class="lokasi-suggest-empty">Tidak ditemukan dalam daftar</div>';
    box.style.display = 'block'; return;
  }
  box.innerHTML = matches.map(l => {
    const v = l.replace(/'/g, "\\'");
    return `<div class="lokasi-suggest-item" data-val="${escHtml(l)}" onmousedown="pilihLokasiEdit('${v}')">${escHtml(l)}</div>`;
  }).join('');
  box.style.display = 'block';
}

function pilihLokasiEdit(val) {
  const inp = document.getElementById('editInputLokasi');
  inp.value = val; _editLokasiValid = true;
  document.getElementById('lokasiSuggestBoxEdit').style.display = 'none';
  inp.classList.remove('error');
}

function validateLokasiEdit(inp) {
  setTimeout(() => {
    document.getElementById('lokasiSuggestBoxEdit').style.display = 'none';
    const val = inp.value.trim();
    const exact = DAFTAR_LOKASI.find(l => l.toLowerCase() === val.toLowerCase());
    if (exact) { inp.value = exact; _editLokasiValid = true; inp.classList.remove('error'); }
    else { _editLokasiValid = false; if (val) inp.classList.add('error'); }
  }, 150);
}

// ─── KEYBOARD NAV ───
document.addEventListener('keydown', function(e) {
  const box = document.getElementById('lokasiSuggestBox');
  if (!box || box.style.display === 'none') return;
  const items = box.querySelectorAll('.lokasi-suggest-item');
  if (!items.length) return;
  if (e.key === 'ArrowDown') { e.preventDefault(); _lokasiSuggestIndex = Math.min(_lokasiSuggestIndex + 1, items.length - 1); items.forEach((el, i) => el.classList.toggle('active', i === _lokasiSuggestIndex)); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); _lokasiSuggestIndex = Math.max(_lokasiSuggestIndex - 1, 0); items.forEach((el, i) => el.classList.toggle('active', i === _lokasiSuggestIndex)); }
  else if (e.key === 'Enter') { if (_lokasiSuggestIndex >= 0 && items[_lokasiSuggestIndex]) pilihLokasi(items[_lokasiSuggestIndex].dataset.val); }
  else if (e.key === 'Escape') { box.style.display = 'none'; }
});
