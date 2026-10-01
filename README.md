# eLogističar - Web aplikacija za upravljanje transportom i logistikom

**eLogističar** je sveobuhvatan sistem namenjen digitalizaciji, optimizaciji i automatizaciji logističkih procesa. Aplikacija omogućava dispečerima centralizovano planiranje zbirnog transporta i automatski proračun ruta sa međustajalištima, dok vozačima pruža dinamički, prilagođeni interfejs za praćenje vožnje i isporuke u realnom vremenu.


##  Ključne tehničke funkcionalnosti

* **Algoritamsko računanje rute (OSRM API):** Automatsko geokodiranje gradova (*Open-Meteo API*) i izračunavanje precizne cestovne udaljenosti i etapa (polazište ➔ stajalište ➔ odredište) putem *OSRM Routing Engine-a*.
* **Asinhrona sinhronizacija stanja:** Vozač kroz aplikaciju dinamički menja stanja rute (*Na čekanju* ➔ *Ka stajalištu* ➔ *Ka odredištu* ➔ *Završeno*), što u realnom vremenu ažurira traku napretka i preostalu kilometražu.
* **Pametna raspodela tereta i nosivosti:** Automatska provera kapaciteta na osnovu tipa vozila (tone za kamione, litri za cisterne) uz mogućnost odvajanja tereta za tranzitno stajalište i krajnje odredište.
* **Vremenska prognoza u realnom vremenu:** Integracija *Open-Meteo API-ja* za prikaz trenutnih vremenskih uslova na krajnjoj destinaciji vožnje.
* **Interni sistem komunikacije (Chat):** Asinhroni chat sa podrškom za privatno i grupno dopisivanje između dispečera i vozača.
* **Samo-učeća baza gradova:** `<datalist>` autocomplete polje koje dinamički uči i pamti svaki novi uneti grad u SQLite bazi.
* **Automatsko generisanje PDF naloga:** Dvosmerno kreiranje zvaničnih putnih naloga spremnih za štampu.

---

##  Tehnologije

* **Backend:** Python 3, FastAPI, Pydantic
* **Baza podataka:** SQLite3 (sa automatskom inicijalizacijom šeme i migracijama)
* **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+ Fetch API)
* **Eksterni API-ji:** Open-Meteo (Geocoding & Weather), OSRM (Routing)

---

##  Uputstvo za pokretanje aplikacije

Projekat je konfigurisan tako da se pokreće u svega par komandi, bez potrebe za ručnim podešavanjem baze podataka.

1. Instalacija zavisnosti
Otvorite terminal (Command Prompt, PowerShell ili integrisani VS Code terminal) u korenskom folderu projekta i pokrenite: pip install fastapi uvicorn pydantic
2. Pokretanje servera
U istom terminalu pokrenite server komandom: uvicorn main:app --reload
3. Pristup i prijava
Otvorite web pregledač i idite na adresu: http://localhost:8000

Za pristup sistemu koristite automatski kreirani dispečerski nalog:

Korisničko ime: Test
Šifra: Test123

Preporučeni scenario za testiranje
Da biste u potpunosti isprobali mogućnosti sistema:

Dispečerski modul (http://localhost:8000):

Prijavite se sa nalogom Test / Test123.
Otvorite tab Vozila i dodajte novo vozilo (npr. Teretnjak, registracija BG-123-TX, nosivost 10 t).
Otvorite tab Vozači i kreirajte novog vozača (npr. Ime: Marko, Šifra: vozac123).
Na Kontrolnoj tabli kreirajte novu turu: izaberite vozača, vozilo, unesite polazište (npr. Kragujevac), stajalište (npr. Velika Plana) i odredište (npr. Beograd).
Dodajte zahteve kupaca sa naznačenim mestom istovara (Stajalište ili Krajnje odredište) i kreirajte turu. Sistem će automatski izračunati etape kilometraže.

Vozački modul (Inkognito / drugi prozor):

Otvorite novi (inkognito) prozor na http://localhost:8000 i prijavite se kao vozač (Marko / vozac123).
Pregledajte rutu, etape puta sa kilometražom, vremensku prognozu i raspodelu tereta.
Kliknite Započni vožnju i pratite kako se status, navigacioni linkovi i traka napretka menjaju u skladu sa fazama vožnje (Ka stajalištu ➔ Ka odredištu ➔ Završeno).
Isprobajte Chat prozor u donjem desnom uglu za komunikaciju u realnom vremenu između dispečera i vozača.