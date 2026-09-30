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

async function renderTure(ture) {
    const kontejner = document.getElementById('lista-tura');
    
    if (ture.length === 0) {
        kontejner.innerHTML = `
            <div class="prazno-stanje">
                <div></div>
                Nema tura za odabrani status.
            </div>`;
        return;
    }

    const redovi = await Promise.all(ture.map(async (t) => {
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

        const vremeBedz = await dohvatiVreme(t.odrediste);

        return `
            <div class="kartica">
                <div class="kartica-header">
                    <span class="tura-id">TR-${t.id + 2800}</span>
                    ${statusBadge}
                </div>
                <div class="kartica-body">
                    <div class="info-red">
                        <span class="ikona">📍</span> 
                        <span><strong>${t.polaziste}</strong> ➔ <strong>${t.odrediste}</strong> ${vremeBedz}</span>
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
    }));

    kontejner.innerHTML = redovi.join('');
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

// CHAT LOGIKA
let chatOtvoren = false;
let poznatePoruke = new Set();
let neprocitanoPoKanalu = { "Svi": 0, "Dispecer": 0 };
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
        const aktKanal = document.getElementById("chat-primalac") ? document.getElementById("chat-primalac").value : "Dispecer";
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
        const originalIme = opt.value === "Svi" ? "Grupni chat (Svi)" : "Privatno (Dispečer)";
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

async function ucitajPoruke() {
    try {
        const odg = await fetch("/poruke");
        if (!odg.ok) return;
        
        const svePoruke = await odg.json();
        const aktKanal = document.getElementById("chat-primalac") ? document.getElementById("chat-primalac").value : "Dispecer";
        
        let trebaRender = false;

        svePoruke.forEach(p => {
            const zaMeneSvi = (p.primalac === "Svi");
            const zaMenePrivatno = (p.primalac === korisnikIme || (p.ime === korisnikIme && p.primalac === "Dispecer"));
            
            if (zaMeneSvi || zaMenePrivatno) {
                if (!poznatePoruke.has(p.id)) {
                    poznatePoruke.add(p.id);
                    
                    let kanalPoruke = zaMeneSvi ? "Svi" : "Dispecer";

                    if (chatOtvoren && kanalPoruke === aktKanal) {
                        trebaRender = true;
                    } else {
                        neprocitanoPoKanalu[kanalPoruke] = (neprocitanoPoKanalu[kanalPoruke] || 0) + 1;
                        if (!chatOtvoren) neprocitanihUkupno++;
                        if (kanalPoruke === aktKanal) trebaRender = true;
                    }
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
                return p.primalac === korisnikIme || (p.ime === korisnikIme && p.primalac === "Dispecer");
            });

            zadnjiPrikazanBroj = filtriranePoruke.length;
            const kontejner = document.getElementById("chat-poruke");
            if (kontejner) {
                kontejner.innerHTML = filtriranePoruke.map(p => {
                    const moja = p.ime === korisnikIme;
                    const poravnanje = moja ? 'flex-end' : 'flex-start';
                    const pozadina = moja ? '#10b981' : '#334155';
                    const zaobljenje = moja ? '12px 12px 0 12px' : '12px 12px 12px 0';
                    const bojaImena = moja ? '#a7f3d0' : '#94a3b8';
                    const oznaka = p.primalac === 'Svi' ? '(svima)' : (moja ? '(dispečer)' : '(privatno)');
                    
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
    
    const primalac = document.getElementById("chat-primalac") ? document.getElementById("chat-primalac").value : "Dispecer";
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
            "marsej": "Marseille"
        };

        const kljuc = cistGrad.toLowerCase();
        if (prevod[kljuc]) cistGrad = prevod[kljuc];

        const geoOdg = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cistGrad)}&count=1`);
        const geoPodaci = await geoOdg.json();
        
        if (!geoPodaci.results || geoPodaci.results.length === 0) return "";
        
        const lat = geoPodaci.results[0].latitude;
        const lon = geoPodaci.results[0].longitude;
        
        const vremeOdg = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
        const vremePodaci = await vremeOdg.json();
        
        const temp = Math.round(vremePodaci.current_weather.temperature);
        const kod = vremePodaci.current_weather.weathercode;
        
        let ikona = "☀️"; 
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