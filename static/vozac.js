const idVozaca = localStorage.getItem('korisnik_id');
const rola = localStorage.getItem('korisnik_rola');
let sveTureVozaca = [];

if (!idVozaca || rola !== 'Vozac') {
    window.location.href = '/';
}

document.getElementById('ime-vozaca').innerText = localStorage.getItem('korisnik_ime');

async function ucitajTure() {
    try {
        const odg = await fetch(`/ture-vozaca/${idVozaca}`);
        sveTureVozaca = await odg.json();
        primeniFilter();
    } catch (err) {
        document.getElementById('lista-tura').innerHTML = `<div class="prazno-stanje">Greška pri učitavanju tura sa servera.</div>`;
    }
}

function primeniFilter() {
    const filterElement = document.getElementById('status-filter');
    const izabraniStatus = filterElement ? filterElement.value : 'Sve';
    
    let filtriraneTure = sveTureVozaca;
    
    if (izabraniStatus !== 'Sve') {
        filtriraneTure = sveTureVozaca.filter(t => t.status === izabraniStatus);
    }

    const prioritetStatusa = {
        "U toku": 1,
        "Na čekanju": 2,
        "Završeno": 3
    };

    filtriraneTure.sort((a, b) => {
        if (prioritetStatusa[a.status] !== prioritetStatusa[b.status]) {
            return prioritetStatusa[a.status] - prioritetStatusa[b.status];
        }
        return b.id - a.id;
    });
    
    renderTure(filtriraneTure);
}

function renderTure(ture) {
    const kontejner = document.getElementById('lista-tura');
    
    if (ture.length === 0) {
        kontejner.innerHTML = `
            <div class="prazno-stanje">
                <div>☕</div>
                Nema tura za odabrani status.
            </div>`;
        return;
    }

    kontejner.innerHTML = ture.map(t => {
        let statusBadge = '';
        let akcionoDugme = '';

        if (t.status === 'Na čekanju') {
            statusBadge = `<span class="badge bg-zuta">Na čekanju</span>`;
            akcionoDugme = `<button class="btn-akcija btn-zapocni" onclick="promeniStatus(${t.id}, 'U toku')">▶ Započni vožnju</button>`;
        } else if (t.status === 'U toku') {
            statusBadge = `<span class="badge bg-plava">U toku</span>`;
            akcionoDugme = `<button class="btn-akcija btn-zavrsi" onclick="promeniStatus(${t.id}, 'Završeno')">✔ Obeleži kao završeno</button>`;
        } else {
            statusBadge = `<span class="badge bg-zelena">Završeno</span>`;
            akcionoDugme = ``; 
        }

        
        const urlMape = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(t.polaziste)}&destination=${encodeURIComponent(t.odrediste)}`;
        const navigacijaDugme = `<a href="${urlMape}" target="_blank" class="btn-akcija" style="background-color: #334155; color: white; text-decoration: none;">Navigacija</a>`;
        const akcijeHtml = (t.status !== 'Završeno') 
            ? `<div class="akcije">${akcionoDugme}${navigacijaDugme}</div>` 
            : ``;

        return `
            <div class="kartica">
                <div class="kartica-header">
                    <span class="tura-id">TR-${t.id + 2800}</span>
                    ${statusBadge}
                </div>
                <div class="kartica-body">
                    <div class="info-red">
                        <span class="ikona">📍</span> 
                        <span><strong>${t.polaziste}</strong> ➔ <strong>${t.odrediste}</strong></span>
                    </div>
                    <div class="info-red">
                        <span class="ikona">🚚</span> 
                        <span>Vozilo: <strong>${t.vozilo}</strong></span>
                    </div>
                    <div class="roba-box">
                         Teret: ${t.kupac}
                    </div>
                </div>
                ${akcijeHtml}
            </div>
        `;
    }).join('');
}

async function promeniStatus(idTure, noviStatus) {

    if (!confirm(`Da li potvrđujete promenu statusa u "${noviStatus}"?`)) return;
    
    const odg = await fetch(`/azuriraj-status/${idTure}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: noviStatus })
    });

    if (odg.ok) {
        ucitajTure(); 
        prikaziToast("Status vožnje je uspešno ažuriran!", "uspeh");
    } else {
        prikaziToast("Došlo je do greške pri ažuriranju statusa.", "greska");
    }
}

function odjaviSe() {
    localStorage.clear();
    window.location.href = '/';
}

ucitajTure();

function prikaziToast(poruka, tip = "uspeh") {
    const toast = document.createElement("div");
    toast.innerText = poruka;
    
    toast.style.position = "fixed";
    toast.style.bottom = "30px";
    toast.style.left = "50%";
    toast.style.transform = "translateX(-50%) translateY(20px)";
    toast.style.padding = "12px 24px";
    toast.style.borderRadius = "8px";
    toast.style.color = "white";
    toast.style.fontSize = "14px";
    toast.style.fontWeight = "600";
    toast.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
    toast.style.zIndex = "9999";
    toast.style.transition = "opacity 0.3s ease, transform 0.3s ease";
    toast.style.opacity = "0";
    toast.style.textAlign = "center";
    toast.style.width = "max-content";
    toast.style.maxWidth = "90%";

    toast.style.backgroundColor = tip === "uspeh" ? "#10b981" : "#ef4444";

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "1";
        toast.style.transform = "translateX(-50%) translateY(0)";
    }, 10);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(-50%) translateY(20px)";
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}