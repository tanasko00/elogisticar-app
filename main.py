from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles # DODATO OVO
from pydantic import BaseModel
from typing import List, Optional
import sqlite3
from datetime import datetime, timedelta

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")

def inicijalizuj_bazu():
    konekcija = sqlite3.connect("elogisticar.db")
    kursor = konekcija.cursor()
    try:
        kursor.execute("ALTER TABLE Tura ADD COLUMN Datum TEXT DEFAULT '2026-09-29'")
    except:
        pass # Kolona već postoji
    kursor.execute("""
        CREATE TABLE IF NOT EXISTS Zahtev (
            ID_Zahteva INTEGER PRIMARY KEY AUTOINCREMENT,
            PIB_Kupca TEXT,
            Roba TEXT,
            ID_Ture INTEGER,
            Status TEXT DEFAULT 'Na čekanju',
            FOREIGN KEY (PIB_Kupca) REFERENCES Kupac(PIB_Kupca),
            FOREIGN KEY (ID_Ture) REFERENCES Tura(ID_Ture)
        )
    """)
    konekcija.commit()
    konekcija.close()

inicijalizuj_bazu()

class PodaciZaPrijavu(BaseModel):
    korisnicko_ime: str
    sifra: str

class ZahtevZaTuru(BaseModel):
    pib_kupca: str
    roba: str

class PodaciZaTuru(BaseModel):
    polaziste: str
    odrediste: str
    id_vozaca: int
    registracija: str
    datum: str
    zahtevi: List[ZahtevZaTuru] # Više zahteva za zbirni transport

class NoviStatus(BaseModel):
    status: str

class NoviKupac(BaseModel):
    pib: str
    naziv: str
    adresa: str

class NovoVozilo(BaseModel):
    registracija: str
    marka: str
    nosivost: float
    tip: str

class NoviVozac(BaseModel):
    ime: str
    prezime: str
    sifra: str

@app.get("/")
def pocetna(): return FileResponse("index.html")

@app.get("/dispecer")
def ekran_dispecer(): return FileResponse("dispecer.html")

@app.get("/vozac")
def ekran_vozac(): return FileResponse("vozac.html")

@app.post("/prijava")
def prijava(podaci: PodaciZaPrijavu):
    konekcija = sqlite3.connect("elogisticar.db")
    kursor = konekcija.cursor()
    kursor.execute("SELECT Id_Korisnika, Ime, Prezime, Rola FROM Korisnik WHERE Ime=? AND Sifra=?", (podaci.korisnicko_ime, podaci.sifra))
    korisnik = kursor.fetchone()
    konekcija.close()
    if korisnik:
        return {"status": "Uspešno", "id": korisnik[0], "rola": korisnik[3], "ime": korisnik[1], "prezime": korisnik[2]}
    else:
        raise HTTPException(status_code=401, detail="Pogrešno korisničko ime ili šifra.")

@app.get("/podaci-za-dispecera")
def podaci_dispecer():
    konekcija = sqlite3.connect("elogisticar.db")
    kursor = konekcija.cursor()
    kursor.execute("SELECT Id_Korisnika, Ime, Prezime FROM Korisnik WHERE Rola='Vozac'")
    vozaci = [{"id": r[0], "ime": f"{r[1]} {r[2]}"} for r in kursor.fetchall()]
    
    # Dodata Nosivost u upit
    kursor.execute("SELECT Registarski_br, Marka, Tip_vozila, Nosivost FROM Vozilo")
    vozila = [{"registracija": r[0], "marka": r[1], "tip": r[2], "nosivost": r[3]} for r in kursor.fetchall()]
    
    kursor.execute("SELECT PIB_Kupca, Naziv_kompanije FROM Kupac")
    kupci = [{"pib": r[0], "naziv": r[1]} for r in kursor.fetchall()]
    konekcija.close()
    return {"vozaci": vozaci, "vozila": vozila, "kupci": kupci}

@app.get("/statistika")
def statistika():
    konekcija = sqlite3.connect("elogisticar.db")
    kursor = konekcija.cursor()
    
    # 1. Ukupno vozila u floti
    kursor.execute("SELECT COUNT(*) FROM Vozilo")
    ukupno_vozila = kursor.fetchone()[0]
    
    # 2. Vozila koja su trenutno zauzeta (imaju dodeljenu turu koja nije 'Završeno')
    kursor.execute("SELECT COUNT(DISTINCT Registarski_br) FROM Tura WHERE Status_Realizacije != 'Završeno'")
    zauzeta_vozila = kursor.fetchone()[0]
    dostupna_vozila = ukupno_vozila - zauzeta_vozila
    
    # 3. Ukupno aktivnih tura na nivou celog sistema
    kursor.execute("SELECT COUNT(*) FROM Tura WHERE Status_Realizacije != 'Završeno'")
    aktivne_ture = kursor.fetchone()[0]
    
    # 4. Ture završene danas (za zelenu statistiku)
    danas = datetime.now().strftime('%Y-%m-%d')
    kursor.execute("SELECT COUNT(*) FROM Tura WHERE Status_Realizacije = 'Završeno' AND Datum = ?", (danas,))
    zavrseno_danas = kursor.fetchone()[0]
    
    konekcija.close()
    
    return {
        "dostupna_vozila": dostupna_vozila,
        "ukupno_vozila": ukupno_vozila,
        "aktivne_ture": aktivne_ture,
        "zavrseno_danas": zavrseno_danas
    }

@app.post("/nova-tura")
def dodaj_turu(tura: PodaciZaTuru):
    konekcija = sqlite3.connect("elogisticar.db")
    kursor = konekcija.cursor()
    try:
       
        kursor.execute("""
            SELECT ID_Ture FROM Tura 
            WHERE Datum = ? AND Status_Realizacije != 'Završeno' 
            AND (Registarski_br = ? OR Id_Korisnika = ?)
        """, (tura.datum, tura.registracija, tura.id_vozaca))
        
        postojeca = kursor.fetchone()
        if postojeca:
            raise HTTPException(status_code=400, detail="Vozač ili vozilo su već zauzeti na odabrani datum!")

        #kreiramo turu
        kursor.execute("INSERT INTO Tura (Id_Korisnika, Registarski_br, PIB_Kupca, Polaziste, Odrediste, Status_Realizacije, Datum) VALUES (?, ?, '', ?, ?, 'Na čekanju', ?)", 
                       (tura.id_vozaca, tura.registracija, tura.polaziste, tura.odrediste, tura.datum))
        id_ture = kursor.lastrowid
        
        for z in tura.zahtevi:
            kursor.execute("INSERT INTO Zahtev (PIB_Kupca, Roba, ID_Ture) VALUES (?, ?, ?)", (z.pib_kupca, z.roba, id_ture))
        
        konekcija.commit()
        return {"status": "Uspešno"}
    except HTTPException as e:
        raise e
    except Exception as g: 
        raise HTTPException(status_code=500, detail=str(g))
    finally: 
        konekcija.close()

@app.get("/sedmicni-pregled")
def sedmicni_pregled(pocetni_datum: str = None):
    konekcija = sqlite3.connect("elogisticar.db")
    kursor = konekcija.cursor()
    
    # 1. Hvatanje svih vozila
    kursor.execute("SELECT Registarski_br, Tip_vozila, Nosivost FROM Vozilo")
    vozila_baza = kursor.fetchall()
    
    # 2. Hvatanje tura s imenom vozača
    kursor.execute("""
        SELECT T.ID_Ture, T.Registarski_br, T.Datum, T.Status_Realizacije, T.Polaziste, T.Odrediste, K.Ime || ' ' || K.Prezime
        FROM Tura T
        LEFT JOIN Korisnik K ON T.Id_Korisnika = K.Id_Korisnika
    """)
    ture = kursor.fetchall()
    
    # 3. Hvatanje zahtjeva (robe) po turama
    kursor.execute("""
        SELECT Z.ID_Ture, Z.Roba, Ku.Naziv_kompanije
        FROM Zahtev Z
        LEFT JOIN Kupac Ku ON Z.PIB_Kupca = Ku.PIB_Kupca
    """)
    zahtevi_baza = kursor.fetchall()
    zahtevi_po_turi = {}
    for z in zahtevi_baza:
        id_t, roba, kupac = z
        if id_t not in zahtevi_po_turi:
            zahtevi_po_turi[id_t] = []
        zahtevi_po_turi[id_t].append(f"{kupac if kupac else 'Kupac'}: {roba}")

    konekcija.close()
    
    zauzece = {r[0]: {} for r in vozila_baza}
    detalji_vozila = {r[0]: {"tip": r[1], "nosivost": r[2]} for r in vozila_baza}
    

    for t in ture:
        id_ture, reg, datum, status, polaziste, odrediste, vozac = t
        if reg in zauzece:
            zauzece[reg][datum] = {
                "id": id_ture,
                "status": status,
                "polaziste": polaziste,
                "odrediste": odrediste,
                "vozac": vozac if vozac else "Nije dodijeljen",
                "roba": zahtevi_po_turi.get(id_ture, [])
            }
            
    if pocetni_datum:
        try:
            trenutni = datetime.strptime(pocetni_datum, '%Y-%m-%d')
        except ValueError:
            trenutni = datetime.now()
    else:
        trenutni = datetime.now()
        
    dani = [(trenutni + timedelta(days=i)).strftime('%Y-%m-%d') for i in range(7)]
    
    return {"dani": dani, "zauzece": zauzece, "detalji_vozila": detalji_vozila}

@app.get("/sve-ture")
def dohvati_ture():
    konekcija = sqlite3.connect("elogisticar.db")
    kursor = konekcija.cursor()
    kursor.execute("""
        SELECT T.ID_Ture, K.Ime, K.Prezime, T.Registarski_br, T.Polaziste, T.Odrediste, T.Status_Realizacije, T.Datum
        FROM Tura T LEFT JOIN Korisnik K ON T.Id_Korisnika = K.Id_Korisnika
    """)
    ture_baza = kursor.fetchall()
    konekcija.close()
    return [{"id": t[0], "vozac": f"{t[1]} {t[2]}", "vozilo": t[3], "polaziste": t[4], "odrediste": t[5], "status": t[6], "datum": t[7]} for t in ture_baza]

@app.delete("/obrisi-turu/{id_ture}")
def obrisi_turu(id_ture: int):
    konekcija = sqlite3.connect("elogisticar.db")
    kursor = konekcija.cursor()
    kursor.execute("DELETE FROM Zahtev WHERE ID_Ture = ?", (id_ture,))
    kursor.execute("DELETE FROM Tura WHERE ID_Ture = ?", (id_ture,))
    konekcija.commit()
    konekcija.close()
    return {"status": "Uspešno"}


@app.post("/novi-kupac")
def nov_kupac(k: NoviKupac):
    konekcija = sqlite3.connect("elogisticar.db"); konekcija.cursor().execute("INSERT INTO Kupac VALUES (?, ?, ?)", (k.pib, k.naziv, k.adresa)); konekcija.commit(); konekcija.close(); return {"status": "Uspešno"}
@app.post("/novo-vozilo")
def novo_vozilo(v: NovoVozilo):
    konekcija = sqlite3.connect("elogisticar.db")
    konekcija.cursor().execute(
        "INSERT INTO Vozilo (Registarski_br, Marka, Nosivost, Tip_vozila) VALUES (?, ?, ?, ?)", 
        (v.registracija, v.marka, v.nosivost, v.tip)
    )
    konekcija.commit()
    konekcija.close()
    return {"status": "Uspešno"}
@app.post("/novi-vozac")
def novi_vozac(v: NoviVozac):
    konekcija = sqlite3.connect("elogisticar.db"); konekcija.cursor().execute("INSERT INTO Korisnik (Ime, Prezime, Rola, Sifra) VALUES (?, ?, 'Vozac', ?)", (v.ime, v.prezime, v.sifra)); konekcija.commit(); konekcija.close(); return {"status": "Uspešno"}

# RUTA ZA VOZAČA
@app.get("/ture-vozaca/{id_vozaca}")
def ture_vozaca(id_vozaca: int):
    konekcija = sqlite3.connect("elogisticar.db")
    kursor = konekcija.cursor()
    # GROUP_CONCAT spaja sve firme i robe iz tabele Zahtev u jedan tekst
    upit = """
        SELECT T.ID_Ture, T.Registarski_br, T.Polaziste, T.Odrediste, T.Status_Realizacije,
               GROUP_CONCAT(K.Naziv_kompanije || ' - ' || Z.Roba, ', ') as DetaljiKupaca
        FROM Tura T
        LEFT JOIN Zahtev Z ON T.ID_Ture = Z.ID_Ture
        LEFT JOIN Kupac K ON Z.PIB_Kupca = K.PIB_Kupca
        WHERE T.Id_Korisnika = ?
        GROUP BY T.ID_Ture
    """
    kursor.execute(upit, (id_vozaca,))
    ture_baza = kursor.fetchall()
    konekcija.close()
    
    return [
        {
            "id": t[0], 
            "vozilo": t[1] or "Nema", 
            "polaziste": t[2], 
            "odrediste": t[3], 
            "status": t[4], 
            "kupac": t[5] or "Nema dodatih zahteva"
        } for t in ture_baza
    ]

# RUTA ZA VOZAČA: Promena statusa (U toku, Završeno)
@app.post("/azuriraj-status/{id_ture}")
def azuriraj_status(id_ture: int, podaci: NoviStatus):
    konekcija = sqlite3.connect("elogisticar.db")
    kursor = konekcija.cursor()
    kursor.execute("UPDATE Tura SET Status_Realizacije = ? WHERE ID_Ture = ?", (podaci.status, id_ture))
    konekcija.commit()
    konekcija.close()
    return {"status": "Uspešno"}

# --- PYDANTIC MODELI ZA IZMENE ---
class IzmenaSifre(BaseModel):
    id_vozaca: int
    nova_sifra: str

class IzmenaKupca(BaseModel):
    pib: str
    naziv: str
    adresa: str

class IzmenaVozila(BaseModel):
    registracija: str
    marka: str
    nosivost: float
    tip: str

# --- VOZILA (Pregled, Izmena, Brisanje) ---
@app.get("/sva-vozila")
def sva_vozila():
    konekcija = sqlite3.connect("elogisticar.db")
    kursor = konekcija.cursor()
    kursor.execute("SELECT Registarski_br, Marka, Nosivost, Tip_vozila FROM Vozilo")
    v = [{"registracija": r[0], "marka": r[1], "nosivost": r[2], "tip": r[3]} for r in kursor.fetchall()]
    konekcija.close()
    return v

@app.delete("/obrisi-vozilo/{registracija}")
def obrisi_vozilo(registracija: str):
    konekcija = sqlite3.connect("elogisticar.db")
    kursor = konekcija.cursor()
    kursor.execute("DELETE FROM Vozilo WHERE Registarski_br = ?", (registracija,))
    konekcija.commit()
    konekcija.close()
    return {"status": "Uspešno"}

@app.post("/izmeni-vozilo")
def izmeni_vozilo(v: IzmenaVozila):
    konekcija = sqlite3.connect("elogisticar.db")
    kursor = konekcija.cursor()
    kursor.execute("UPDATE Vozilo SET Marka=?, Nosivost=?, Tip_vozila=? WHERE Registarski_br=?", (v.marka, v.nosivost, v.tip, v.registracija))
    konekcija.commit()
    konekcija.close()
    return {"status": "Uspešno"}

# --- VOZAČI (Pregled, Promena šifre, Brisanje) ---
@app.get("/svi-vozaci")
def svi_vozaci():
    konekcija = sqlite3.connect("elogisticar.db")
    kursor = konekcija.cursor()
    kursor.execute("SELECT Id_Korisnika, Ime, Prezime, Sifra FROM Korisnik WHERE Rola='Vozac'")
    v = [{"id": r[0], "ime": r[1], "prezime": r[2], "sifra": r[3]} for r in kursor.fetchall()]
    konekcija.close()
    return v

@app.delete("/obrisi-vozaca/{id_vozaca}")
def obrisi_vozaca(id_vozaca: int):
    konekcija = sqlite3.connect("elogisticar.db")
    kursor = konekcija.cursor()
    kursor.execute("DELETE FROM Korisnik WHERE Id_Korisnika = ?", (id_vozaca,))
    konekcija.commit()
    konekcija.close()
    return {"status": "Uspešno"}

@app.post("/izmeni-sifru-vozaca")
def izmeni_sifru_vozaca(s: IzmenaSifre):
    konekcija = sqlite3.connect("elogisticar.db")
    kursor = konekcija.cursor()
    kursor.execute("UPDATE Korisnik SET Sifra=? WHERE Id_Korisnika=?", (s.nova_sifra, s.id_vozaca))
    konekcija.commit()
    konekcija.close()
    return {"status": "Uspešno"}

# --- KUPCI (Pregled, Izmena, Brisanje) ---
@app.get("/svi-kupci")
def svi_kupci():
    konekcija = sqlite3.connect("elogisticar.db")
    kursor = konekcija.cursor()
    kursor.execute("SELECT PIB_Kupca, Naziv_kompanije, Adresa FROM Kupac")
    k = [{"pib": r[0], "naziv": r[1], "adresa": r[2]} for r in kursor.fetchall()]
    konekcija.close()
    return k

@app.delete("/obrisi-kupca/{pib}")
def obrisi_kupca(pib: str):
    konekcija = sqlite3.connect("elogisticar.db")
    kursor = konekcija.cursor()
    kursor.execute("DELETE FROM Kupac WHERE PIB_Kupca = ?", (pib,))
    konekcija.commit()
    konekcija.close()
    return {"status": "Uspešno"}

@app.post("/izmeni-kupca")
def izmeni_kupca(k: IzmenaKupca):
    konekcija = sqlite3.connect("elogisticar.db")
    kursor = konekcija.cursor()
    kursor.execute("UPDATE Kupac SET Naziv_kompanije=?, Adresa=? WHERE PIB_Kupca=?", (k.naziv, k.adresa, k.pib))
    konekcija.commit()
    konekcija.close()
    return {"status": "Uspešno"}