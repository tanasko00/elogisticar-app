let trenutniZahtevi = [];
let prikazaniDatumKalendara = new Date();
let mapaTuraZaKalendar = {};
let sveTurePodaci = [];

document.getElementById("izbor_vozila").addEventListener("change", function() {
    const tip = this.options[this.selectedIndex].getAttribute("data-tip");
    const opisInput = document.getElementById("opis_robe");
    if (tip === "Cisterna") {
        opisInput.placeholder = "Unesi tečnost (npr. 5000 litara)";
    } else if (tip === "Teretnjak") {
        opisInput.placeholder = "Opis robe (npr. 2 palete ili 500 kg)";
    } else {
        opisInput.placeholder = "Opis robe";
    }
    osveziPrikazKapaciteta();
});

function promijeniTab(idTaba, element) {
    document.querySelectorAll('.sadrzaj-taba').forEach(tab => tab.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(link => link.classList.remove('active'));

    document.getElementById(idTaba).style.display = 'block';
    element.classList.add('active');
    document.getElementById('naslov-stranice').innerText = element.innerText;

    if (idTaba === 'tab-vozila') ucitajSvaVozila();
    if (idTaba === 'tab-vozaci') ucitajSveVozace();
    if (idTaba === 'tab-kupci') ucitajSveKupce();
    if (idTaba === 'tab-ture') ucitajArhivuTura();
}

function postaviPodatkeKorisnika() {
    const ime = localStorage.getItem("korisnik_ime") || "Nepoznat";
    const prezime = localStorage.getItem("korisnik_prezime") || "Korisnik";
    const rola = localStorage.getItem("korisnik_rola") || "Dispečer";

    document.getElementById("profil-ime-tekst").innerText = `${ime} ${prezime}`;
    document.getElementById("profil-rola-tekst").innerText = rola;
    document.getElementById("profil-inicijali").innerText = ime.charAt(0) + prezime.charAt(0);
}

function postaviDanasnjiDatum() {
    const opcije = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    const danasnjiTekst = new Date().toLocaleDateString('sr-RS', opcije);
    document.getElementById("tekst-datum").innerText = "Pregled · " + danasnjiTekst;
}

function odjaviSe() {
    localStorage.clear();
    window.location.href = "/";
}

function formatirajDatumZaAPI(datum) {
    return datum.toISOString().split('T')[0];
}

async function osveziStatistiku() {
    try {
        const odg = await fetch("/statistika");
        const stat = await odg.json();
        document.getElementById("stat-dostupna").innerText = stat.dostupna_vozila;
        document.getElementById("stat-ukupno").innerText = `od ${stat.ukupno_vozila} u floti`;
        document.getElementById("stat-aktivne").innerText = stat.aktivne_ture;
        document.getElementById("stat-zavrseno").innerText = stat.zavrseno_danas;
    } catch (err) {
        console.error("Greška statistike", err);
    }
}

async function ucitajArhivuTura() {
    try {
        const odg = await fetch("/sve-ture");
        sveTurePodaci = await odg.json();
        renderArhivaTura(sveTurePodaci);
    } catch (err) {
        console.error("Greška pri učitavanju arhive tura", err);
    }
}

function renderArhivaTura(ture) {
    const tbody = document.getElementById("tabela-arhiva-tura");
    if (ture.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #64748b; padding: 20px;">Nema pronađenih tura za zadane filtere.</td></tr>`;
        return;
    }
    tbody.innerHTML = ture.map(t =>
        `<tr>
                    <td style="color: #3b82f6; font-weight: 500;">TR-${t.id + 2800}</td>
                    <td>${t.vozac}</td>
                    <td style="color: #94a3b8;">${t.vozilo}</td>
                    <td style="color: #94a3b8;">📍 ${t.polaziste} ➔ ${t.odrediste}</td>
                    <td style="color: #94a3b8;">${t.datum}</td>
                    <td>${getStatusBadge(t.status)}</td>
                    <td style="display: flex; gap: 8px;">
                        <button style="background-color: #3b82f6; color: white; border: none; padding: 6px 12px; font-size: 12px; border-radius: 6px; cursor: pointer;" onclick="stampajPutniNalog(${t.id})">🖨️ PDF</button>
                        <button class="btn-crveno" onclick="obrisiTuru(${t.id})">Obriši</button>
                    </td>
                </tr>`
    ).join('');
}

function filtrirajArhivu() {
    const pretraga = document.getElementById("filter-pretraga").value.toLowerCase();
    const status = document.getElementById("filter-status").value;
    const datum = document.getElementById("filter-datum").value;

    const filtrirano = sveTurePodaci.filter(t => {
        const matchPretraga = (t.vozac && t.vozac.toLowerCase().includes(pretraga)) ||
            (t.vozilo && t.vozilo.toLowerCase().includes(pretraga)) ||
            (t.polaziste && t.polaziste.toLowerCase().includes(pretraga)) ||
            (t.odrediste && t.odrediste.toLowerCase().includes(pretraga));

        const matchStatus = status === "" || t.status === status;

        const matchDatum = datum === "" || (t.datum && t.datum.includes(datum));

        return matchPretraga && matchStatus && matchDatum;
    });

    renderArhivaTura(filtrirano);
}

function resetujFiltereTura() {
    document.getElementById("filter-pretraga").value = "";
    document.getElementById("filter-status").value = "";
    document.getElementById("filter-datum").value = "";
    renderArhivaTura(sveTurePodaci);
}

async function ucitajInicijalno() {
    postaviPodatkeKorisnika();
    postaviDanasnjiDatum();

    const odg = await fetch("/podaci-za-dispecera");
    const p = await odg.json();

    document.getElementById("izbor_kupca").innerHTML = '<option value="">Izaberi kupca...</option>' + p.kupci.map(k => `<option value="${k.pib}">${k.naziv}</option>`).join('');
    document.getElementById("izbor_vozaca").innerHTML = '<option value="">Izaberi vozača...</option>' + p.vozaci.map(v => `<option value="${v.id}">${v.ime}</option>`).join('');

    document.getElementById("izbor_vozila").innerHTML = '<option value="" data-tip="" data-nosivost="0">Izaberi vozilo...</option>' + p.vozila.map(v => {
        const jedinica = v.tip === "Cisterna" ? "L" : "t";
        return `<option value="${v.registracija}" data-tip="${v.tip}" data-nosivost="${v.nosivost}">${v.registracija} (${v.marka} - Max: ${v.nosivost} ${jedinica})</option>`;
    }).join('');

    document.getElementById('datum_ture').valueAsDate = new Date();

    osveziKalendar();
    ucitajTure();
    osveziStatistiku();
}

function pomeriKalendar(dani) {
    prikazaniDatumKalendara.setDate(prikazaniDatumKalendara.getDate() + dani);
    osveziKalendar();
}

async function osveziKalendar() {
    const datumParam = formatirajDatumZaAPI(prikazaniDatumKalendara);
    const odg = await fetch(`/sedmicni-pregled?pocetni_datum=${datumParam}`);
    const podaci = await odg.json();

    mapaTuraZaKalendar = {};

    let header = "<th>Registracija vozila</th>";
    podaci.dani.forEach(d => header += `<th>${d}</th>`);
    document.getElementById("kalendar-header").innerHTML = header;

    let html = "";
    for (const [reg, daniObj] of Object.entries(podaci.zauzece)) {
        const info = podaci.detalji_vozila[reg] || {
            tip: "Teretnjak",
            nosivost: 0
        };
        const jedinica = info.tip === "Cisterna" ? "L" : "t";

        html += `<tr><td><strong>${reg}</strong><br><span style="font-size:11px; color:#94a3b8;">${info.tip} (${info.nosivost} ${jedinica})</span></td>`;
        podaci.dani.forEach(d => {
            const turaInfo = daniObj[d];
            if (turaInfo && typeof turaInfo === 'object' && turaInfo.status !== "Završeno") {
                const kljuc = `${reg}_${d}`;
                mapaTuraZaKalendar[kljuc] = turaInfo;

                html += `<td class="zauzeto" onclick="otvoriModalTure('${kljuc}', '${reg}', '${d}')" style="cursor: pointer;" title="Klikni za detalje">
                                    Zauzeto<br><span style="font-size:10px; font-weight: normal; color:#f87171;">(${turaInfo.status})</span>
                                 </td>`;
            } else if (typeof turaInfo === 'string' && turaInfo !== "Završeno") {
                html += `<td class="zauzeto">Zauzeto<br><span style="font-size:10px; font-weight: normal; color:#f87171;">(${turaInfo})</span></td>`;
            } else {
                html += `<td class="slobodno">Slobodno</td>`;
            }
        });
        html += `</tr>`;
    }
    document.getElementById("kalendar-body").innerHTML = html;
}

function otvoriModalTure(kljuc, reg, datum) {
    const tura = mapaTuraZaKalendar[kljuc];
    if (!tura) return;

    document.getElementById("modal-naslov-ture").innerText = `Tura TR-${tura.id + 2800} (${reg})`;

    let robaHtml = tura.roba && tura.roba.length > 0 ?
        tura.roba.map(r => `<li style="margin-left:15px;">${r}</li>`).join('') :
        "<i>Nema detalja o robi</i>";

    document.getElementById("modal-sadrzaj-ture").innerHTML = `
                <div><strong style="color:#94a3b8;">Datum:</strong> ${datum}</div>
                <div><strong style="color:#94a3b8;">Vozač:</strong> ${tura.vozac}</div>
                <div><strong style="color:#94a3b8;">Relacija:</strong>  ${tura.polaziste} ➔ ${tura.odrediste}</div>
                <div><strong style="color:#94a3b8;">Status:</strong> <span style="color:#fbbf24;">${tura.status}</span></div>
                <div style="border-top: 1px dashed #334155; padding-top: 8px; margin-top: 4px;">
                    <strong style="color:#94a3b8;">Utovareni teret:</strong>
                    <ul style="margin-top: 4px; color: #38bdf8;">${robaHtml}</ul>
                </div>
            `;

    document.getElementById("modal-detalje-ture").style.display = "flex";
}

function zatvoriModalTure() {
    document.getElementById("modal-detalje-ture").style.display = "none";
}

function osveziPrikazKapaciteta() {
    const voziloSelect = document.getElementById("izbor_vozila");
    const kontejner = document.getElementById("prikaz-popunjenosti");

    if (!voziloSelect.value) {
        kontejner.style.display = "none";
        return;
    }

    const tipVozila = voziloSelect.options[voziloSelect.selectedIndex].getAttribute("data-tip");
    const maxNosivost = parseFloat(voziloSelect.options[voziloSelect.selectedIndex].getAttribute("data-nosivost")) || 0;
    const jedinica = tipVozila === "Cisterna" ? "L" : "t";

    let trenutnoZauzeto = 0;
    trenutniZahtevi.forEach(zahtev => {
        const zMala = zahtev.roba.toLowerCase();
        const m = zahtev.roba.match(/\d+(\.\d+)?/);
        if (m) {
            let b = parseFloat(m[0]);
            if (tipVozila === "Teretnjak" && (zMala.includes("kg") || zMala.includes("kilogram"))) b = b / 1000;
            trenutnoZauzeto += b;
        }
    });

    const preostalo = maxNosivost - trenutnoZauzeto;
    const procenat = maxNosivost > 0 ? Math.min(100, Math.round((trenutnoZauzeto / maxNosivost) * 100)) : 0;
    let bojaStatusa = preostalo >= 0 ? "#34d399" : "#f87171";
    let trakaBoja = preostalo >= 0 ? "#10b981" : "#ef4444";

    kontejner.style.display = "block";
    kontejner.innerHTML = `
                <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;">
                    <span>Kapacitet: <strong>${maxNosivost} ${jedinica}</strong></span>
                    <span>Utovareno: <strong>${trenutnoZauzeto} ${jedinica}</strong> (${procenat}%)</span>
                    <span style="color: ${bojaStatusa}; font-weight: 600;">Slobodno još: ${preostalo.toFixed(2)} ${jedinica}</span>
                </div>
                <div style="width: 100%; background: #1e293b; height: 8px; border-radius: 4px; overflow: hidden;">
                    <div style="width: ${Math.min(procenat, 100)}%; background: ${trakaBoja}; height: 100%; transition: width 0.3s ease;"></div>
                </div>
            `;
}

function dodajPrivremeniZahtev() {
    const voziloSelect = document.getElementById("izbor_vozila");
    const kupacSelect = document.getElementById("izbor_kupca");
    const robaInput = document.getElementById("opis_robe").value.trim();
    
    const mestoIstovaraElement = document.getElementById("mesto_istovara");
    const lokacijaIstovara = mestoIstovaraElement ? mestoIstovaraElement.value : "Krajnje odredište";

    if (!voziloSelect.value) return alert("Prvo izaberi vozilo!");
    if (!kupacSelect.value || !robaInput) return alert("Izaberi kupca i unesi robu.");

    const tipVozila = voziloSelect.options[voziloSelect.selectedIndex].getAttribute("data-tip");
    const maksimalnaNosivost = parseFloat(voziloSelect.options[voziloSelect.selectedIndex].getAttribute("data-nosivost"));

    const match = robaInput.match(/\d+(\.\d+)?/);
    if (!match) return alert("Morate uneti količinu u brojevima (npr. '500 kg', '2 t' ili '1000 l').");
    let unetiBroj = parseFloat(match[0]);
    const robaMala = robaInput.toLowerCase();

    if (tipVozila === "Cisterna" && (robaMala.includes("palet") || robaMala.includes("kutij") || robaMala.includes("kg") || robaMala.includes("ton"))) {
        return alert("Greška: Cisterna prima isključivo tečnost u litrima!");
    }
    if (tipVozila === "Teretnjak" && (robaMala.includes("litar") || robaMala.includes("litara") || robaMala.includes(" lit"))) {
        return alert("Greška: Tečnosti u litrima idu u cisternu!");
    }

    let kolicinaZaPoređenje = unetiBroj;
    if (tipVozila === "Teretnjak" && (robaMala.includes("kg") || robaMala.includes("kilogram"))) {
        kolicinaZaPoređenje = unetiBroj / 1000;
    }

    let trenutnoZauzeto = 0;
    trenutniZahtevi.forEach(zahtev => {
        const zMala = zahtev.roba.toLowerCase();
        const m = zahtev.roba.match(/\d+(\.\d+)?/);
        if (m) {
            let b = parseFloat(m[0]);
            if (tipVozila === "Teretnjak" && (zMala.includes("kg") || zMala.includes("kilogram"))) b = b / 1000;
            trenutnoZauzeto += b;
        }
    });

    if (trenutnoZauzeto + kolicinaZaPoređenje > maksimalnaNosivost) {
        if (tipVozila === "Cisterna") return alert(` Prekoračenje kapaciteta cisterne!\nMax: ${maksimalnaNosivost} L.`);
        else return alert(` Prekoračenje nosivosti teretnjaka!\nMax: ${maksimalnaNosivost} t.`);
    }

    const finalRoba = `[${lokacijaIstovara}] ${robaInput}`;

    trenutniZahtevi.push({
        pib_kupca: kupacSelect.value,
        naziv: kupacSelect.options[kupacSelect.selectedIndex].text,
        roba: finalRoba
    });
    osveziSpisakZahteva();
    document.getElementById("opis_robe").value = "";
}

function osveziSpisakZahteva() {
    const div = document.getElementById("spisak-dodatih-zahteva");
    if (trenutniZahtevi.length === 0) {
        div.innerHTML = '<span style="color: #64748b;">Nema dodatih zahteva u turu...</span>';
    } else {
        div.innerHTML = trenutniZahtevi.map((z) => `<div class="zahtev-stavka">📦 Zahtev: <strong>${z.naziv}</strong> - ${z.roba}</div>`).join('');
    }
    osveziPrikazKapaciteta();
}

async function lansirajTuru() {
    if (trenutniZahtevi.length === 0) return prikaziToast("Dodajte barem jedan zahtev u turu!", "greska");
    
    const stajalisteElement = document.getElementById("stajaliste");
    const stajalisteTxt = stajalisteElement ? stajalisteElement.value.trim() : "";
    const polazisteTxt = document.getElementById("polaziste").value;
    const odredisteTxt = document.getElementById("odrediste").value;

    prikaziToast("Računam rutu i kreiram turu...", "uspeh");

    const autoKm = await izracunajRutu(polazisteTxt, stajalisteTxt, odredisteTxt);
    
    const tura = {
        id_vozaca: parseInt(document.getElementById("izbor_vozaca").value),
        registracija: document.getElementById("izbor_vozila").value,
        datum: document.getElementById("datum_ture").value,
        polaziste: polazisteTxt,
        stajaliste: stajalisteTxt,
        odrediste: odredisteTxt,
        kilometraza: autoKm.ukupno,
        km_do_stajalista: autoKm.do_stajalista,
        zahtevi: trenutniZahtevi
    };
    
    const odgovor = await fetch("/nova-tura", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tura)
    });
    
    if (odgovor.ok) {
        trenutniZahtevi = [];
        osveziSpisakZahteva();
        ucitajTure();
        osveziKalendar();
        osveziStatistiku();
        prikaziToast("Tura je uspešno kreirana!", "uspeh");
    } else {
        const greska = await odgovor.json();
        prikaziToast("Greška: " + greska.detail, "greska");
    }
}

function getStatusBadge(status) {
    if (status === "Završeno") return '<span class="status-btn status-zavrseno">● Završeno</span>';
    if (status === "U toku" || status === "Ka odredištu") return '<span class="status-btn status-u-toku">● ' + status + '</span>';
    return '<span class="status-btn status-na-cekanju">● Na čekanju</span>';
}

async function ucitajTure() {
    const odg = await fetch("/sve-ture");
    let sveTure = await odg.json();

    const filterElement = document.getElementById("filter-aktivnih");
    const izabraniStatus = filterElement ? filterElement.value : "Sve";

    let aktivne = sveTure.filter(t => t.status !== "Završeno");

    if (izabraniStatus === "U toku") {
        aktivne = aktivne.filter(t => t.status === "U toku" || t.status === "Ka odredištu");
    } else if (izabraniStatus !== "Sve") {
        aktivne = aktivne.filter(t => t.status === izabraniStatus);
    }

    const zaPrikaz = aktivne.sort((a, b) => b.id - a.id).slice(0, 10);

    const tbody = document.getElementById("tabela-tura");
    
    if (zaPrikaz.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #64748b; padding: 20px;">Trenutno nema aktivnih tura za odabrani filter.</td></tr>`;
        return;
    }

    const redovi = await Promise.all(zaPrikaz.map(async (t) => {
        const vremeBedz = await dohvatiVreme(t.odrediste);
        
        return `<tr>
            <td style="color: #3b82f6; font-weight: 500;">TR-${t.id + 2800}</td>
            <td>${t.vozac}</td>
            <td style="color: #94a3b8;">${t.vozilo}</td>
            <td style="color: #e2e8f0;">📍 ${t.polaziste} ➔ ${t.odrediste} ${vremeBedz}</td>
            <td style="color: #94a3b8;">${t.datum}</td>
            <td>${getStatusBadge(t.status)}</td>
            <td><button class="btn-crveno" onclick="obrisiTuru(${t.id})">Obriši</button></td>
        </tr>`;
    }));

    tbody.innerHTML = redovi.join('');
}

async function obrisiTuru(id) {
    if (confirm("Obriši turu?")) {
        await fetch(`/obrisi-turu/${id}`, {
            method: "DELETE"
        });
        ucitajTure();
        osveziKalendar();
        osveziStatistiku();
    }
}

/* Vozila */
async function ucitajSvaVozila() {
    const odg = await fetch("/sva-vozila");
    const vozila = await odg.json();
    document.getElementById("tabela-sva-vozila").innerHTML = vozila.map(v =>
        `<tr><td><strong>${v.registracija}</strong></td><td>${v.marka}</td><td>${v.tip}</td><td>${v.nosivost} ${v.tip==='Cisterna'?'L':'t'}</td>
                <td><button class="btn-zuto" onclick="izmeniVoziloPrompt('${v.registracija}', '${v.marka}', ${v.nosivost}, '${v.tip}')">Izmeni</button> 
                <button class="btn-crveno" onclick="obrisiVozilo('${v.registracija}')">Obriši</button></td></tr>`
    ).join('');
}
async function obrisiVozilo(reg) {
    if (confirm(`Obriši vozilo ${reg}?`)) {
        await fetch(`/obrisi-vozilo/${reg}`, {
            method: "DELETE"
        });
        ucitajSvaVozila();
        ucitajInicijalno();
    }
}
async function izmeniVoziloPrompt(reg, marka, nosivost, tip) {
    const novaMarka = prompt("Nova marka:", marka);
    if (!novaMarka) return;
    const novaNosivost = prompt("Nova nosivost/kapacitet:", nosivost);
    if (!novaNosivost) return;
    await fetch("/izmeni-vozilo", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            registracija: reg,
            marka: novaMarka,
            nosivost: parseFloat(novaNosivost),
            tip: tip
        })
    });
    ucitajSvaVozila();
    ucitajInicijalno();
}

/* Vozaci */
async function ucitajSveVozace() {
    const odg = await fetch("/svi-vozaci");
    const vozaci = await odg.json();
    document.getElementById("tabela-svi-vozaci").innerHTML = vozaci.map(v =>
        `<tr><td>#${v.id}</td><td><strong>${v.ime} ${v.prezime}</strong></td><td><code>${v.sifra}</code></td>
                <td><button class="btn-zuto" onclick="izmeniSifruPrompt(${v.id}, '${v.sifra}')">Promeni šifru</button> 
                <button class="btn-crveno" onclick="obrisiVozaca(${v.id})">Obriši</button></td></tr>`
    ).join('');
}
async function obrisiVozaca(id) {
    if (confirm(`Obriši vozača #${id}?`)) {
        await fetch(`/obrisi-vozaca/${id}`, {
            method: "DELETE"
        });
        ucitajSveVozace();
        ucitajInicijalno();
    }
}
async function izmeniSifruPrompt(id, staraSifra) {
    const novaSifra = prompt("Unesite novu šifru za vozača:", staraSifra);
    if (!novaSifra) return;
    await fetch("/izmeni-sifru-vozaca", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            id_vozaca: id,
            nova_sifra: novaSifra
        })
    });
    ucitajSveVozace();
}

/* Kupci */
async function ucitajSveKupce() {
    const odg = await fetch("/svi-kupci");
    const kupci = await odg.json();
    document.getElementById("tabela-svi-kupci").innerHTML = kupci.map(k =>
        `<tr><td><code>${k.pib}</code></td><td><strong>${k.naziv}</strong></td><td>${k.adresa}</td>
                <td><button class="btn-zuto" onclick="izmeniKupcaPrompt('${k.pib}', '${k.naziv}', '${k.adresa}')">Izmeni</button> 
                <button class="btn-crveno" onclick="obrisiKupca('${k.pib}')">Obriši</button></td></tr>`
    ).join('');
}
async function obrisiKupca(pib) {
    if (confirm(`Obriši kupca PIB: ${pib}?`)) {
        await fetch(`/obrisi-kupca/${pib}`, {
            method: "DELETE"
        });
        ucitajSveKupce();
        ucitajInicijalno();
    }
}
async function izmeniKupcaPrompt(pib, naziv, adresa) {
    const noviNaziv = prompt("Novi naziv kompanije:", naziv);
    if (!noviNaziv) return;
    const novaAdresa = prompt("Nova adresa:", adresa);
    if (!novaAdresa) return;
    await fetch("/izmeni-kupca", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            pib: pib,
            naziv: noviNaziv,
            adresa: novaAdresa
        })
    });
    ucitajSveKupce();
    ucitajInicijalno();
}

/* Dodavanje */
async function dodajKupca() {
    const pib = document.getElementById("k_pib").value.trim();
    const naziv = document.getElementById("k_naziv").value.trim();
    const adresa = document.getElementById("k_adresa").value.trim();
    if (!pib || !naziv || !adresa) return alert("Popunite sva polja!");
    const odg = await fetch("/novi-kupac", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            pib: pib,
            naziv: naziv,
            adresa: adresa
        })
    });
    if (odg.ok) {
        alert("Kupac dodat!");
        ucitajSveKupce();
        ucitajInicijalno();
        document.getElementById("k_pib").value = "";
        document.getElementById("k_naziv").value = "";
        document.getElementById("k_adresa").value = "";
    }
}

async function dodajVozaca() {
    const ime = document.getElementById("v_ime").value.trim();
    const prezime = document.getElementById("v_prezime").value.trim();
    const sifra = document.getElementById("v_sifra").value.trim();
    if (!ime || !prezime || !sifra) return alert("Popunite sva polja!");
    const odg = await fetch("/novi-vozac", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            ime: ime,
            prezime: prezime,
            sifra: sifra
        })
    });
    if (odg.ok) {
        alert("Vozač dodat!");
        ucitajSveVozace();
        ucitajInicijalno();
        document.getElementById("v_ime").value = "";
        document.getElementById("v_prezime").value = "";
        document.getElementById("v_sifra").value = "";
    }
}

async function dodajVozilo() {
    const reg = document.getElementById("voz_reg").value.trim();
    const marka = document.getElementById("voz_marka").value.trim();
    const nosivost = document.getElementById("voz_nosivost").value;
    const tip = document.getElementById("voz_tip").value;
    if (!reg || !marka || !nosivost) return alert("Popunite sva polja!");
    const odg = await fetch("/novo-vozilo", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            registracija: reg,
            marka: marka,
            nosivost: parseFloat(nosivost),
            tip: tip
        })
    });
    if (odg.ok) {
        alert("Vozilo dodato!");
        ucitajSvaVozila();
        ucitajInicijalno();
        document.getElementById("voz_reg").value = "";
        document.getElementById("voz_marka").value = "";
        document.getElementById("voz_nosivost").value = "";
    }
}


function stampajPutniNalog(idTure) {
   
            const tura = sveTurePodaci.find(t => t.id === idTure);
            if (!tura) return alert("Podaci o turi nisu pronađeni.");


            const prozor = window.open('', '_blank', 'width=800,height=900');
            

            prozor.document.write(`
                <html>
                <head>
                    <title>Putni Nalog TR-${tura.id + 2800}</title>
                    <style>
                        body { font-family: 'Arial', sans-serif; padding: 40px; color: #000; background: #fff; }
                        .zaglavlje { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 40px; }
                        h1 { margin: 0; font-size: 26px; text-transform: uppercase; letter-spacing: 1px; }
                        .podnaslov { font-size: 14px; color: #555; margin-top: 5px; }
                        .sekcija { margin-bottom: 25px; font-size: 16px; line-height: 1.8; }
                        .oznaka { font-weight: bold; min-width: 150px; display: inline-block; }
                        .linija-podataka { border-bottom: 1px dotted #ccc; display: inline-block; width: 60%; }
                        .potpisi { margin-top: 100px; display: flex; justify-content: space-between; }
                        .mesto-potpis { border-top: 1px solid #000; width: 250px; text-align: center; padding-top: 8px; font-size: 14px; }
                        
                        /* Sakrivamo dugmad i suvišne elemente prilikom samog čuvanja u PDF */
                        @media print {
                            @page { margin: 2cm; }
                            body { -webkit-print-color-adjust: exact; }
                        }
                    </style>
                </head>
                <body>
                    <div class="zaglavlje">
                        <h1>Zvanični Putni Nalog</h1>
                        <div class="podnaslov">Dokument za transport robe u domaćem saobraćaju</div>
                    </div>
                    
                    <div class="sekcija">
                        <span class="oznaka">Serijski broj:</span> 
                        <span class="linija-podataka">TR-${tura.id + 2800}</span>
                    </div>
                    <div class="sekcija">
                        <span class="oznaka">Datum izdavanja:</span> 
                        <span class="linija-podataka">${tura.datum}</span>
                    </div>
                    <div class="sekcija">
                        <span class="oznaka">Zaduženi vozač:</span> 
                        <span class="linija-podataka">${tura.vozac}</span>
                    </div>
                    <div class="sekcija">
                        <span class="oznaka">Vozilo (Registracija):</span> 
                        <span class="linija-podataka">${tura.vozilo}</span>
                    </div>
                    <div class="sekcija">
                        <span class="oznaka">Relacija vožnje:</span> 
                        <span class="linija-podataka">${tura.polaziste} ➔ ${tura.odrediste}</span>
                    </div>
                    <div class="sekcija">
                        <span class="oznaka">Trenutni status:</span> 
                        <span class="linija-podataka">${tura.status}</span>
                    </div>

                    <div class="potpisi">
                        <div class="mesto-potpis">Potpis ovlašćenog dispečera</div>
                        <div class="mesto-potpis">Potpis odgovornog vozača</div>
                    </div>
                </body>
                </html>
            `);
            
            prozor.document.close();
            prozor.focus();
            

            setTimeout(() => {
                prozor.print();
            }, 500);
        }

ucitajInicijalno();


function prikaziToast(poruka, tip = "uspeh") {
    const toast = document.createElement("div");
    toast.innerText = poruka;
    

    toast.style.position = "fixed";
    toast.style.bottom = "20px";
    toast.style.right = "20px";
    toast.style.padding = "12px 24px";
    toast.style.borderRadius = "8px";
    toast.style.color = "white";
    toast.style.fontSize = "14px";
    toast.style.fontWeight = "600";
    toast.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
    toast.style.zIndex = "9999";
    toast.style.transition = "opacity 0.3s ease, transform 0.3s ease";
    toast.style.opacity = "0";
    toast.style.transform = "translateY(20px)";


    toast.style.backgroundColor = tip === "uspeh" ? "#10b981" : "#ef4444";

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "1";
        toast.style.transform = "translateY(0)";
    }, 10);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(20px)";
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// CHAT LOGIKA
let chatOtvoren = true;
let poznatePoruke = new Set();
let neprocitanoPoKanalu = {};
let neprocitanihUkupno = 0;
let zadnjiPrikazanBroj = -1;

const korisnikIme = localStorage.getItem('korisnik_ime') || "Nepoznato";
const korisnikRola = localStorage.getItem('korisnik_rola') || "Gost";

function toggleChat() {
    chatOtvoren = !chatOtvoren;
    document.getElementById('chat-telo').style.display = chatOtvoren ? 'flex' : 'none';
    document.getElementById('chat-toggle-ikona').innerText = chatOtvoren ? '▼' : '▲';
    
    if (chatOtvoren) {
        neprocitanihUkupno = 0;
        document.getElementById('chat-notifikacija').style.display = 'none';
        
        const aktKanal = document.getElementById("chat-primalac") ? document.getElementById("chat-primalac").value : "Svi";
        neprocitanoPoKanalu[aktKanal] = 0;
        azurirajImenaKanal();
        
        zadnjiPrikazanBroj = -1;
        ucitajPoruke();
    }
}

function promeniChatKanal() {
    const aktKanal = document.getElementById("chat-primalac").value;
    neprocitanoPoKanalu[aktKanal] = 0; 
    azurirajImenaKanal();
    
    zadnjiPrikazanBroj = -1;
    document.getElementById("chat-poruke").innerHTML = "";
    ucitajPoruke();
}

function azurirajImenaKanal() {
    const select = document.getElementById("chat-primalac");
    if(!select) return;
    
    Array.from(select.options).forEach(opt => {
        const originalIme = opt.getAttribute("data-ime") || opt.innerText;
        if (!opt.hasAttribute("data-ime")) opt.setAttribute("data-ime", originalIme);
        
        const br = neprocitanoPoKanalu[opt.value] || 0;
        if (br > 0) {
            opt.innerText = `🔔 ${originalIme} (+${br})`;
            opt.style.fontWeight = "bold";
        } else {
            opt.innerText = originalIme;
            opt.style.fontWeight = "normal";
        }
    });
}

async function popuniChatVozace() {
    const odg = await fetch("/svi-vozaci");
    const vozaci = await odg.json();
    const select = document.getElementById("chat-primalac");
    if(select) {
        select.innerHTML = '<option value="Svi" data-ime="Grupni chat (Svi vozači)">Grupni chat (Svi vozači)</option>';
        vozaci.forEach(v => {
            const opcija = document.createElement("option");
            opcija.value = v.ime;
            opcija.setAttribute("data-ime", `Vozač: ${v.ime} ${v.prezime}`);
            opcija.innerText = `Vozač: ${v.ime} ${v.prezime}`;
            select.appendChild(opcija);
        });
        azurirajImenaKanal();
    }
}

async function ucitajPoruke() {
    try {
        const odg = await fetch("/poruke");
        if (!odg.ok) return;
        
        const svePoruke = await odg.json();
        const aktKanal = document.getElementById("chat-primalac") ? document.getElementById("chat-primalac").value : "Svi";
        
        let trebaRender = false;

        
        svePoruke.forEach(p => {
            if (!poznatePoruke.has(p.id)) {
                poznatePoruke.add(p.id); 
                
                
                let kanalPoruke = "Svi";
                if (p.primalac !== "Svi") {
                    kanalPoruke = (p.ime === korisnikIme) ? p.primalac : p.ime;
                }

               
                if (chatOtvoren && kanalPoruke === aktKanal) {
                    trebaRender = true; 
                } else {
                    neprocitanoPoKanalu[kanalPoruke] = (neprocitanoPoKanalu[kanalPoruke] || 0) + 1;
                    if (!chatOtvoren) neprocitanihUkupno++;
                    if (kanalPoruke === aktKanal) trebaRender = true;
                }
            }
        });

       
        if (!chatOtvoren && neprocitanihUkupno > 0) {
            const bedz = document.getElementById('chat-notifikacija');
            if (bedz) {
                bedz.innerText = neprocitanihUkupno;
                bedz.style.display = 'block';
            }
        }


        azurirajImenaKanal();

 
        if (trebaRender || zadnjiPrikazanBroj === -1) {
            const filtriranePoruke = svePoruke.filter(p => {
                if (aktKanal === "Svi") return p.primalac === "Svi";
                return p.primalac === aktKanal || (p.ime === aktKanal && p.primalac === "Dispecer");
            });

            zadnjiPrikazanBroj = filtriranePoruke.length;
            const kontejner = document.getElementById("chat-poruke");
            if (kontejner) {
                kontejner.innerHTML = filtriranePoruke.map(p => {
                    const moja = p.ime === korisnikIme;
                    const poravnanje = moja ? 'flex-end' : 'flex-start';
                    const pozadina = moja ? '#3b82f6' : '#334155';
                    const zaobljenje = moja ? '12px 12px 0 12px' : '12px 12px 12px 0';
                    const bojaImena = moja ? '#bfdbfe' : '#94a3b8';
                    const oznaka = p.primalac === 'Svi' ? '(svima)' : (p.primalac === 'Dispecer' ? '(dispečeru)' : '(privatno)');
                    
                    return `
                    <div style="align-self: ${poravnanje}; background: ${pozadina}; max-width: 80%; padding: 8px 12px; border-radius: ${zaobljenje}; box-shadow: 0 1px 2px rgba(0,0,0,0.2);">
                        <div style="font-size: 10px; color: ${bojaImena}; margin-bottom: 4px;">
                            ${p.ime} <span style="font-size: 9px; opacity: 0.7;">${oznaka}</span> 
                        </div>
                        <div style="color: white; line-height: 1.4;">${p.tekst}</div>
                        <div style="font-size: 9px; color: ${bojaImena}; text-align: right; margin-top: 4px; opacity: 0.8;">
                            ${p.vreme}
                        </div>
                    </div>`;
                }).join("");
                
                if (chatOtvoren) kontejner.scrollTop = kontejner.scrollHeight;
            }
        }
    } catch (e) { console.error("Chat greška:", e); }
}

async function posaljiPoruku() {
    const unos = document.getElementById("chat-unos");
    const tekst = unos.value.trim();
    if (!tekst) return;
    
    const primalac = document.getElementById("chat-primalac") ? document.getElementById("chat-primalac").value : "Svi";
    unos.value = ""; 
    
    await fetch("/posalji-poruku", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ime: korisnikIme, rola: korisnikRola, primalac: primalac, tekst: tekst })
    });
    ucitajPoruke(); 
}

document.addEventListener("DOMContentLoaded", () => {
    const chatInput = document.getElementById("chat-unos");
    if(chatInput) {
        chatInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") { 
                e.preventDefault(); 
                posaljiPoruku(); 
            }
        });
    }
    popuniChatVozace(); 
});

setInterval(ucitajPoruke, 3000);
ucitajPoruke();

async function dohvatiVreme(grad) {
    try {
        let cistGrad = grad.trim();
        
        const prevod = {
            "bukurest": "Bucharest",
            "bukurešt": "Bucharest",
            "beč": "Vienna",
            "bec": "Vienna",
            "solun": "Thessaloniki",
            "budimpešta": "Budapest",
            "budimpesta": "Budapest",
            "pariz": "Paris",
            "rim": "Rome",
            "moskva": "Moscow",
            "peking": "Beijing",   
            "minhen": "Munich",
            "keln": "Cologne",
            "štutgart": "Stuttgart",
            "stutgart": "Stuttgart",
            "nirnberg": "Nuremberg",
            "lajpcig": "Leipzig",
            "hanover": "Hanover",
            "milano": "Milan",
            "venecija": "Venice",
            "firenca": "Florence",
            "đenova": "Genoa",
            "denova": "Genoa",
            "trst": "Trieste",
            "napulj": "Naples",
            "torino": "Turin",
            "prag": "Prague",
            "varšava": "Warsaw",
            "varsava": "Warsaw",
            "krakov": "Krakow",
            "segedin": "Szeged",
            "temišvar": "Timisoara",
            "temisvar": "Timisoara",
            "sofija": "Sofia",
            "atina": "Athens",          
            "brisel": "Brussels",
            "antverpen": "Antwerp",
            "hag": "The Hague",
            "ženeva": "Geneva",
            "zeneva": "Geneva",
            "cirih": "Zurich",
            "barselona": "Barcelona",
            "sevilja": "Seville",
            "lisabon": "Lisbon",
            "kopenhagen": "Copenhagen",
            "stokholm": "Stockholm",
            "geteborg": "Gothenburg",
            "marsej": "Marseille",
            "rio de zaneiro": "Rio de Janeiro",
            "rio de žaneiro": "Rio de Janeiro",
            "rio": "Rio de Janeiro"
        };

        const kljuc = cistGrad.toLowerCase();
        if (prevod[kljuc]) {
            cistGrad = prevod[kljuc];
        }

        const geoOdg = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cistGrad)}&count=1`);
        const geoPodaci = await geoOdg.json();
        
        if (!geoPodaci.results || geoPodaci.results.length === 0) return "";
        
        const lat = geoPodaci.results[0].latitude;
        const lon = geoPodaci.results[0].longitude;
        
        const vremeOdg = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
        const vremePodaci = await vremeOdg.json();
        
        const temp = Math.round(vremePodaci.current_weather.temperature);
        const kod = vremePodaci.current_weather.weathercode;
        
        let ikona = "☀️️"; 
        if (kod >= 1 && kod <= 3) ikona = "⛅"; 
        if (kod >= 45 && kod <= 48) ikona = "🌫️"; 
        if (kod >= 51 && kod <= 67) ikona = "🌧️"; 
        if (kod >= 71 && kod <= 77) ikona = "❄️"; 
        if (kod >= 80 && kod <= 82) ikona = "🌦️"; 
        if (kod >= 95) ikona = "⛈️"; 
        
        return `<span style="background: #0ea5e9; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin-left: 8px; font-weight: 700; box-shadow: 0 2px 4px rgba(0,0,0,0.15); display: inline-flex; align-items: center; gap: 4px;">${ikona} ${temp}°C</span>`;
    } catch (e) {
        console.error("Greška pri učitavanju vremena:", e);
        return ""; 
    }
}

let sacuvanoStanjeTura = "";

async function pametnoOsvezavanje() {
    try {
        const odg = await fetch("/sve-ture");
        if (!odg.ok) return;
        const sveTure = await odg.json();
        
        const novoStanje = JSON.stringify(sveTure);

        if (novoStanje !== sacuvanoStanjeTura) {
            const inicijalnoUcitavanje = (sacuvanoStanjeTura === "");
            sacuvanoStanjeTura = novoStanje;
            
            if (!inicijalnoUcitavanje) {
                console.log("🔄 Detektovana promena u bazi!");
                
                ucitajTure(); 
                osveziKalendar();
            }
        }
    } catch (e) {
        console.error("Greška pri sinhronizaciji:", e);
    }
}

setInterval(pametnoOsvezavanje, 5000);


async function dobijKoordinate(grad) {
    if (!grad) return null;
    try {
        let cistGrad = grad.trim().toLowerCase();
        // Pametni rječnik za prevod 
        const prevod = { "bukurest": "Bucharest", "bukurešt": "Bucharest", "beč": "Vienna", "bec": "Vienna", "solun": "Thessaloniki", "budimpešta": "Budapest", "budimpesta": "Budapest", "pariz": "Paris", "rim": "Rome", "moskva": "Moscow", "peking": "Beijing", "minhen": "Munich", "keln": "Cologne", "štutgart": "Stuttgart", "stutgart": "Stuttgart", "nirnberg": "Nuremberg", "lajpcig": "Leipzig", "hanover": "Hanover", "milano": "Milan", "venecija": "Venice", "firenca": "Florence", "đenova": "Genoa", "denova": "Genoa", "trst": "Trieste", "napulj": "Naples", "torino": "Turin", "prag": "Prague", "varšava": "Warsaw", "varsava": "Warsaw", "krakov": "Krakow", "segedin": "Szeged", "temišvar": "Timisoara", "temisvar": "Timisoara", "sofija": "Sofia", "atina": "Athens", "brisel": "Brussels", "antverpen": "Antwerp", "hag": "The Hague", "ženeva": "Geneva", "zeneva": "Geneva", "cirih": "Zurich", "barselona": "Barcelona", "sevilja": "Seville", "lisabon": "Lisbon", "kopenhagen": "Copenhagen", "stokholm": "Stockholm", "geteborg": "Gothenburg", "marsej": "Marseille", "rio de zaneiro": "Rio de Janeiro", "rio de žaneiro": "Rio de Janeiro", "rio": "Rio de Janeiro" };
        
        if (prevod[cistGrad]) cistGrad = prevod[cistGrad];

        const geoOdg = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cistGrad)}&count=1`);
        const geoPodaci = await geoOdg.json();
        
        if (geoPodaci.results && geoPodaci.results.length > 0) {
            return { lat: geoPodaci.results[0].latitude, lon: geoPodaci.results[0].longitude };
        }
        return null;
    } catch (e) { return null; }
}

async function izracunajRutu(polaziste, stajaliste, odrediste) {
    try {
        const t1 = await dobijKoordinate(polaziste);
        const t3 = await dobijKoordinate(odrediste);
        if (!t1 || !t3) return { ukupno: 0, do_stajalista: 0 };

        let coords = `${t1.lon},${t1.lat}`;
        if (stajaliste) {
            const t2 = await dobijKoordinate(stajaliste);
            if (t2) coords += `;${t2.lon},${t2.lat}`;
        }
        coords += `;${t3.lon},${t3.lat}`;

        const osrmOdg = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=false`);
        const osrmPodaci = await osrmOdg.json();
        
        if (osrmPodaci.routes && osrmPodaci.routes.length > 0) {
            const ruta = osrmPodaci.routes[0];
            const ukupno = Math.round(ruta.distance / 1000);
            let do_stajalista = 0;
            
            if (stajaliste && ruta.legs.length > 1) {
                do_stajalista = Math.round(ruta.legs[0].distance / 1000);
            }
            return { ukupno: ukupno, do_stajalista: do_stajalista };
        }
        return { ukupno: 0, do_stajalista: 0 };
    } catch (e) { return { ukupno: 0, do_stajalista: 0 }; }
}