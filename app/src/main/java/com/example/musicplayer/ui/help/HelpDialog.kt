package com.example.musicplayer.ui.help

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.automirrored.filled.PlaylistAdd
import androidx.compose.material.icons.automirrored.filled.PlaylistPlay
import androidx.compose.material.icons.automirrored.outlined.HelpOutline
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.CloudDownload
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Forest
import androidx.compose.material.icons.filled.Fullscreen
import androidx.compose.material.icons.filled.GraphicEq
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.LibraryMusic
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Repeat
import androidx.compose.material.icons.filled.ScreenRotation
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Shuffle
import androidx.compose.material.icons.filled.SkipNext
import androidx.compose.material.icons.filled.SkipPrevious
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material.icons.filled.TouchApp
import androidx.compose.material.icons.filled.TrackChanges
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties

/** Una voce della guida: l'icona del tasto (se c'è), il nome dell'azione e cosa fa. */
private data class HelpEntry(
    val icon: ImageVector?,
    val action: String,
    val description: String
)

private data class HelpSection(
    val title: String,
    val entries: List<HelpEntry>
)

// Testi scritti nel codice, come nel resto dell'app (strings.xml contiene solo app_name).
private val helpSections = listOf(
    HelpSection(
        title = "Barra in basso",
        entries = listOf(
            HelpEntry(Icons.Default.LibraryMusic, "Libreria", "I brani scaricati sul telefono, ascoltabili anche senza connessione."),
            HelpEntry(Icons.AutoMirrored.Filled.PlaylistPlay, "Playlist", "Le playlist che hai creato."),
            HelpEntry(Icons.Default.CloudDownload, "Sfoglia", "Il catalogo online da cui scaricare i brani.")
        )
    ),
    HelpSection(
        title = "Barra in alto",
        entries = listOf(
            HelpEntry(Icons.Default.Settings, "Impostazioni", "Per ora una: quanto resta acceso lo schermo nelle Zone (MZ, CZ, FZ). Come il telefono; sempre acceso mentre la musica suona nella Zona; oppure acceso per 5, 10, 15, 30 o 60 minuti dall'ultimo tocco. La scelta resta anche dopo aver chiuso l'app."),
            HelpEntry(Icons.AutoMirrored.Outlined.HelpOutline, "Guida", "Apre questa guida. Si chiude con la X in alto o con il tasto Indietro del telefono."),
            HelpEntry(Icons.Default.Info, "Informazioni", "Mostra la versione e una breve descrizione dell'app.")
        )
    ),
    HelpSection(
        title = "Libreria",
        entries = listOf(
            HelpEntry(Icons.Default.Search, "Cerca", "Scrivi nel campo in alto per vedere solo i brani il cui titolo o artista contiene il testo. La X svuota la ricerca."),
            HelpEntry(Icons.Default.Person, "Filtro per artista", "Tocca \"Tutti gli artisti\" e scegli un artista per vedere solo i suoi brani. Per tornare a tutti i brani tocca la X accanto al nome, oppure scegli \"Tutti gli artisti\" nell'elenco. Filtro e ricerca si possono usare insieme."),
            HelpEntry(Icons.Default.PlayArrow, "Tocca un brano", "Avvia la riproduzione. La coda è formata dai brani visibili in quel momento, quindi tiene conto di ricerca e filtro."),
            HelpEntry(Icons.Default.TouchApp, "Tieni premuto un brano", "Apre il menu del brano con le voci qui sotto."),
            HelpEntry(Icons.AutoMirrored.Filled.PlaylistAdd, "Aggiungi a playlist", "Scegli una playlist, oppure \"Nuova playlist\" per crearne una con il brano già dentro. Le playlist che contengono già il brano hanno la spunta. È il modo per aggiungere brani alle playlist (dal player si aggiunge il brano in riproduzione)."),
            HelpEntry(Icons.Default.Edit, "Modifica titolo e artista", "La modifica resta solo su questo telefono: il catalogo online non cambia e il brano risulta comunque già scaricato. Titolo e artista non possono restare vuoti."),
            HelpEntry(Icons.Default.Delete, "Elimina dal telefono", "Dopo una conferma, elimina il brano dal telefono."),
            HelpEntry(Icons.Default.GraphicEq, "Barre animate", "Indicano il brano in riproduzione.")
        )
    ),
    HelpSection(
        title = "Playlist",
        entries = listOf(
            HelpEntry(Icons.Default.Add, "Pulsante + in basso a destra", "Crea una playlist: scrivi il nome, scegli un colore e tocca \"Crea\"."),
            HelpEntry(Icons.Default.TouchApp, "Tocca una playlist", "Apre la playlist con i suoi brani.")
        )
    ),
    HelpSection(
        title = "Dentro una playlist",
        entries = listOf(
            HelpEntry(Icons.AutoMirrored.Filled.ArrowBack, "Freccia indietro", "Torna all'elenco delle playlist."),
            HelpEntry(null, "Elimina (in alto)", "Dopo una conferma, elimina la playlist. I brani restano sul telefono."),
            HelpEntry(Icons.Default.PlayArrow, "Tocca un brano", "Avvia la playlist a partire da quel brano."),
            HelpEntry(Icons.Default.TouchApp, "Tieni premuto un brano", "Apre lo stesso menu della Libreria, con in più \"Rimuovi dalla playlist\": il brano esce dalla playlist ma resta sul telefono. \"Elimina dal telefono\" invece lo cancella del tutto."),
            HelpEntry(Icons.Default.Add, "Aggiungere brani", "Dalla Libreria: tieni premuto un brano e scegli \"Aggiungi a playlist\".")
        )
    ),
    HelpSection(
        title = "Sfoglia (catalogo online)",
        entries = listOf(
            HelpEntry(Icons.Default.Person, "Accedi", "Inserisci username e password e tocca \"Accedi\" per vedere il catalogo."),
            HelpEntry(Icons.Default.Search, "Cerca", "Filtra il catalogo per titolo o artista."),
            HelpEntry(Icons.Default.Person, "Filtro per autore", "Tocca \"Tutti gli artisti\" e scegli un autore per vedere solo i suoi brani; la X accanto al nome torna a tutto il catalogo. Si può usare insieme alla ricerca."),
            HelpEntry(Icons.Default.Download, "Scarica", "Scarica il brano sul telefono. Durante il download un cerchio mostra l'avanzamento."),
            HelpEntry(Icons.Default.CheckCircle, "Spunta", "Il brano è già sul telefono e non va scaricato di nuovo."),
            HelpEntry(null, "Download oggi", "Sotto il tuo nome: i download che puoi ancora fare oggi, su quelli disponibili al giorno."),
            HelpEntry(Icons.AutoMirrored.Filled.Logout, "Logout", "Esce dall'account. I brani scaricati restano sul telefono.")
        )
    ),
    HelpSection(
        title = "Mini player",
        entries = listOf(
            HelpEntry(Icons.Default.MusicNote, "Tocca il mini player", "La barra sopra il menu in basso, visibile mentre c'è un brano: toccala per aprire il player."),
            HelpEntry(Icons.Default.PlayArrow, "Play / Pausa", "Mette in pausa o riprende la riproduzione.")
        )
    ),
    HelpSection(
        title = "Player",
        entries = listOf(
            HelpEntry(Icons.Default.KeyboardArrowDown, "Freccia in basso", "Chiude il player e torna alla schermata di prima."),
            HelpEntry(Icons.AutoMirrored.Filled.PlaylistAdd, "Aggiungi a playlist", "Aggiunge il brano in riproduzione a una playlist esistente, oppure a una nuova creata con \"Nuova Playlist\"."),
            HelpEntry(null, "Barra di avanzamento", "Trascinala per spostarti avanti o indietro nel brano."),
            HelpEntry(Icons.Default.SkipPrevious, "Precedente", "Torna all'inizio del brano o al brano precedente."),
            HelpEntry(Icons.Default.PlayArrow, "Play / Pausa", "Mette in pausa o riprende la riproduzione."),
            HelpEntry(Icons.Default.SkipNext, "Successiva", "Passa al brano successivo, anche in modalità casuale; alla fine della coda si riparte dal primo."),
            HelpEntry(Icons.Default.Shuffle, "Casuale", "Attiva o disattiva l'ordine casuale. Quando è attivo l'icona è colorata."),
            HelpEntry(Icons.Default.Repeat, "Ripeti", "Ogni tocco cambia modalità: nessuna ripetizione, ripeti il brano (icona con l'1), ripeti tutta la coda."),
            HelpEntry(Icons.Default.Timer, "Sleep timer", "Ferma la riproduzione dopo 15, 30, 45, 60 o 90 minuti. Mentre è attivo mostra i minuti rimasti: toccalo di nuovo per annullarlo."),
            HelpEntry(Icons.Default.GraphicEq, "MZ", "Entra nella Music Zone, il visualizzatore a schermo intero. Quando è attiva la scritta MZ è colorata."),
            HelpEntry(Icons.Default.TrackChanges, "CZ", "Entra nella Circle Zone, la ruota delle note del brano. Quando è attiva la scritta CZ è colorata."),
            HelpEntry(Icons.Default.Forest, "FZ", "Entra nella Firewatch Zone, la torretta nel bosco con il cielo dell'ora del giorno e gli uccelli che seguono la musica. Quando è attiva la scritta FZ è colorata. MZ, CZ e FZ non sono mai attive insieme.")
        )
    ),
    HelpSection(
        title = "Music Zone",
        entries = listOf(
            HelpEntry(Icons.Default.GraphicEq, "Il visualizzatore", "Sei voci scorrono in ordine sulla stessa figura, una curva simmetrica con 3, 4, 5, 6, 7 e 8 lobi e poi di nuovo indietro: la figura cambia sui colpi forti del brano, ogni 8-16 secondi. La musica decide quanto sono profondi i lobi, quanto respira la figura e quanto corrono le voci; sui colpi forti partono degli anelli. I colori vengono dalla copertina (casuali se non c'è); dietro c'è una nebulosa negli stessi colori, diversa per ogni brano."),
            HelpEntry(Icons.Default.SkipPrevious, "Precedente, Play / Pausa, Successiva", "I comandi in basso (in orizzontale a destra). In pausa l'animazione si ferma."),
            HelpEntry(Icons.Default.ScreenRotation, "Ruota", "Passa dal verticale all'orizzontale e viceversa. La Music Zone ricorda la scelta finché l'app resta aperta."),
            HelpEntry(Icons.Default.Fullscreen, "Schermo intero", "Nasconde le barre del telefono e i comandi, in verticale come in orizzontale. Tocca lo schermo per far riapparire i comandi: spariscono da soli dopo qualche secondo. Per uscire tocca di nuovo il tasto o premi Indietro."),
            HelpEntry(Icons.Default.KeyboardArrowDown, "Freccia in basso o Indietro", "Esci dalla schermata (a schermo intero, Indietro esce prima dallo schermo intero) ma la Music Zone resta attiva: i brani successivi restano in Music Zone e toccando il mini player ci torni."),
            HelpEntry(Icons.Default.Settings, "Schermo acceso", "Nelle Zone lo schermo resta acceso secondo le Impostazioni (l'ingranaggio nella barra in alto): vale per MZ, CZ e FZ."),
            HelpEntry(Icons.Default.Close, "Esci da MZ", "Spegne la Music Zone e torna al player normale.")
        )
    ),
    HelpSection(
        title = "Circle Zone",
        entries = listOf(
            HelpEntry(Icons.Default.TrackChanges, "La ruota", "Le sette note della tonalità del brano sono le sette direzioni dei vertici, con la tonica in alto. Le note alterate stanno nella direzione della loro lettera (Do♯ in quella del Do) e il nome compare in oro quando suonano. Il triangolo è l'accordo in corso, i precedenti restano più tenui."),
            HelpEntry(Icons.Default.GraphicEq, "Le voci", "Melodia, voce di mezzo e basso sono la nota più forte di tre registri e passano da un angolo all'altro degli ettagoni: la direzione è la nota, l'ettagono l'ottava (un ettagono per ottava, i bassi in quelli interni). A ogni nota la testa si accende. Gli echi sono la melodia ripresa 2, 4 e 6 battute dopo e ruotata di 3/7, 6/7 e 2/7, come le voci di un canone: l'orologio in basso a destra mostra le rotazioni. Nella legenda sono accese le voci che suonano."),
            HelpEntry(Icons.Default.Info, "Da dove vengono i dati", "Tonalità, accordi, tempo, battute e sezioni sono stimati dall'audio la prima volta che apri un brano nella Circle Zone (qualche secondo), poi restano salvati. Sono una stima: su brani molto ritmati o pieni di rumore può sbagliare."),
            HelpEntry(Icons.Default.ScreenRotation, "Ruota e Schermo intero", "Come nella Music Zone. La Circle Zone parte in orizzontale; a schermo intero spariscono solo i comandi."),
            HelpEntry(Icons.Default.KeyboardArrowDown, "Freccia in basso o Indietro", "Esci dalla schermata ma la Circle Zone resta attiva: toccando il mini player ci torni."),
            HelpEntry(Icons.Default.Close, "Esci da CZ", "Spegne la Circle Zone e torna al player normale.")
        )
    ),
    HelpSection(
        title = "Firewatch Zone",
        entries = listOf(
            HelpEntry(Icons.Default.Forest, "La scena", "Una torretta antincendio nel bosco. Il cielo segue l'ora del telefono: alba, giorno, tramonto e notte, con il sole o la luna che si spostano e passano dietro le montagne; di notte compaiono le stelle e si accendono le finestre della torretta. Gli stormi di uccelli seguono l'energia del brano, che cambia nel tempo: più è energico, più uccelli in cielo e più in fretta volano. Quando l'energia cala alcuni stormi volano via; quando il brano finisce resta la scena base."),
            HelpEntry(Icons.Default.Info, "Da dove viene l'energia", "Dal volume, dalla brillantezza del suono e dai colpi forti, rispetto al resto del brano: la stessa analisi della Music Zone, fatta una volta per brano. Un brano tranquillo non arriva mai al cielo più affollato."),
            HelpEntry(Icons.Default.ScreenRotation, "Ruota e Schermo intero", "Come nella Music Zone. La Firewatch Zone parte in verticale."),
            HelpEntry(Icons.Default.KeyboardArrowDown, "Freccia in basso o Indietro", "Esci dalla schermata ma la Firewatch Zone resta attiva: toccando il mini player ci torni."),
            HelpEntry(Icons.Default.Close, "Esci da FZ", "Spegne la Firewatch Zone e torna al player normale.")
        )
    )
)

/**
 * Guida all'uso dell'app, a schermo intero. Si apre solo dal tasto "?" della barra in alto
 * e si chiude con la X o con il tasto Indietro, tornando alla schermata di prima.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HelpDialog(onDismiss: () -> Unit) {
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = MaterialTheme.colorScheme.background
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                TopAppBar(
                    title = { Text("Guida") },
                    navigationIcon = {
                        IconButton(onClick = onDismiss) {
                            Icon(Icons.Default.Close, contentDescription = "Chiudi guida")
                        }
                    }
                )
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
                ) {
                    helpSections.forEach { section ->
                        item(key = "title_" + section.title) {
                            Text(
                                text = section.title,
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.padding(top = 16.dp, bottom = 4.dp)
                            )
                        }
                        items(section.entries, key = { section.title + "_" + it.action }) { entry ->
                            HelpEntryRow(entry)
                        }
                        item(key = "divider_" + section.title) {
                            HorizontalDivider(modifier = Modifier.padding(top = 8.dp))
                        }
                    }
                    item(key = "bottom_space") {
                        Spacer(modifier = Modifier.height(24.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun HelpEntryRow(entry: HelpEntry) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        verticalAlignment = Alignment.Top
    ) {
        if (entry.icon != null) {
            Icon(
                imageVector = entry.icon,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(24.dp)
            )
        } else {
            Spacer(modifier = Modifier.size(24.dp))
        }
        Column(modifier = Modifier.padding(start = 16.dp)) {
            Text(
                text = entry.action,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.Medium
            )
            Text(
                text = entry.description,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
