document.getElementById('login-forma').addEventListener('submit', async function(e) {
    e.preventDefault();
    const korisnik = document.getElementById('korisnik').value.trim();
    const sifra = document.getElementById('sifra').value.trim();
    const greskaDiv = document.getElementById('poruka-greska');

    try {
        // Pozivamo backend rutu /prijava
        const odgovor = await fetch('/prijava', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                korisnicko_ime: korisnik,
                sifra: sifra
            })
        });

        if (odgovor.ok) {
            const podaci = await odgovor.json();

            // Čuvamo podatke u browseru kako bi ih ostale stranice mogle čitati
            localStorage.setItem('korisnik_id', podaci.id);
            localStorage.setItem('korisnik_ime', podaci.ime);
            localStorage.setItem('korisnik_prezime', podaci.prezime);
            localStorage.setItem('korisnik_rola', podaci.rola);

            // Pametno preusmeravanje na osnovu role
            if (podaci.rola === 'Dispecer') {
                window.location.href = '/dispecer';
            } else {
                window.location.href = '/vozac';
            }
        } else {
            const greska = await odgovor.json();
            greskaDiv.innerText = greska.detail || "Pogrešno ime ili lozinka.";
            greskaDiv.style.display = 'block';
        }
    } catch (err) {
        greskaDiv.innerText = "Greška u komunikaciji sa serverom.";
        greskaDiv.style.display = 'block';
    }
});