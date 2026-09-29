const idVozaca = localStorage.getItem('korisnik_id');
const rola = localStorage.getItem('korisnik_rola');

if (!idVozaca || rola !== 'Vozac') {
    window.location.href = '/';
}

document.getElementById('ime-vozaca').innerText = localStorage.getItem('korisnik_ime');

async function ucitajTure() {
    try {
        const odg = await fetch(`/ture-vozaca/${idVozaca}`);
        const ture = await odg.json();
        renderTure(ture);
    } catch (err) {
        document.getElementById('lista-tura').innerHTML = `<div class="prazno-stanje">Greška pri učitavanju tura sa servera.</div>`;
    }
}

function renderTure(ture) {
    const kontejner = document.getElementById('lista-tura');

    if (ture.length === 0) {
        kontejner.innerHTML = `
                    <div class="prazno-stanje">
                        <div>☕</div>
                        Trenutno nemate dodeljenih tura.<br>Odmarajte!
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
            akcionoDugme = ``; // Nema akcija za završene ture
        }

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
                        ${akcionoDugme ? `<div class="akcije">${akcionoDugme}</div>` : ''}
                    </div>
                `;
    }).join('');
}

async function promeniStatus(idTure, noviStatus) {
    if (!confirm(`Da li potvrđujete promenu statusa u "${noviStatus}"?`)) return;

    const odg = await fetch(`/azuriraj-status/${idTure}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            status: noviStatus
        })
    });

    if (odg.ok) {
        ucitajTure();
    } else {
        alert("Došlo je do greške pri ažuriranju statusa.");
    }
}

function odjaviSe() {
    localStorage.clear();
    window.location.href = '/';
}

ucitajTure();