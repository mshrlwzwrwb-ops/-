package com.nostalgia.app

import android.content.Context
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay

private const val WIN_REWARD = 50
private const val AD_REWARD = 100
private const val GAME_PRICE = 3000

private data class RetroGame(val id: String, val title: String, val subtitle: String, val icon: String)

private val games = listOf(
    RetroGame("tictactoe", "איקס עיגול", "המשחק הראשון שלך", "❌⭕"),
    RetroGame("snake", "Snake", "קלאסיקת רטרו", "🐍"),
    RetroGame("pong", "Pong", "דו־קרב קלאסי", "🏓"),
    RetroGame("brick", "Brick Breaker", "שבור את הלבנים", "🧱"),
    RetroGame("space", "Space Retro", "מסע לחלל", "🚀")
)

private class GameStore(context: Context) {
    private val prefs = context.getSharedPreferences("nostalgia_prefs", Context.MODE_PRIVATE)
    fun coins(): Int = prefs.getInt("coins", 0)
    fun addCoins(amount: Int) = prefs.edit().putInt("coins", coins() + amount).apply()
    fun spendCoins(amount: Int): Boolean {
        val current = coins()
        if (current < amount) return false
        prefs.edit().putInt("coins", current - amount).apply()
        return true
    }
    fun isUnlocked(id: String): Boolean = id == "tictactoe" || prefs.getBoolean("unlocked_$id", false)
    fun unlock(id: String) = prefs.edit().putBoolean("unlocked_$id", true).apply()
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { NostalgiaApp(GameStore(this)) }
    }
}

@Composable
private fun NostalgiaApp(store: GameStore) {
    var coins by remember { mutableIntStateOf(store.coins()) }
    var selectedTab by remember { mutableIntStateOf(0) }
    var activeGame by remember { mutableStateOf<String?>(null) }
    var showAd by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf("") }
    fun refresh() { coins = store.coins() }

    if (activeGame == "tictactoe") {
        TicTacToeScreen(
            onBack = { activeGame = null },
            onWin = { store.addCoins(WIN_REWARD); refresh(); message = "ניצחת! +$WIN_REWARD מטבעות 🪙" },
            message = message,
            onMessageClear = { message = "" }
        )
        return
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Nostalgia", fontWeight = FontWeight.ExtraBold) },
                actions = {
                    Surface(
                        shape = RoundedCornerShape(20.dp),
                        color = MaterialTheme.colorScheme.secondaryContainer,
                        modifier = Modifier.padding(end = 12.dp)
                    ) { Text("🪙 $coins", Modifier.padding(horizontal = 14.dp, vertical = 8.dp), fontWeight = FontWeight.Bold) }
                }
            )
        },
        bottomBar = {
            NavigationBar {
                listOf("🏠" to "בית", "🎮" to "משחקים", "🛒" to "חנות").forEachIndexed { index, pair ->
                    NavigationBarItem(selected = selectedTab == index, onClick = { selectedTab = index }, icon = { Text(pair.first) }, label = { Text(pair.second) })
                }
            }
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            item {
                ElevatedCard(
                    Modifier.fillMaxWidth(), RoundedCornerShape(24.dp),
                    colors = CardDefaults.elevatedCardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
                ) {
                    Column(Modifier.padding(20.dp)) {
                        Text("🎲 משחק אקראי", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Black)
                        Spacer(Modifier.height(6.dp))
                        Text("Nostalgia תבחר לך משחק מתוך המשחקים שכבר פתחת.")
                        Spacer(Modifier.height(12.dp))
                        Button(onClick = {
                            val unlocked = games.filter { store.isUnlocked(it.id) }
                            activeGame = unlocked.randomOrNull()?.id
                        }) { Text("שחק עכשיו") }
                    }
                }
            }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), Modifier.fillMaxWidth()) {
                    RewardCard("🏆", "ניצחון", "+50", Modifier.weight(1f))
                    RewardCard("📺", "פרסומת", "+100", Modifier.weight(1f))
                }
            }
            item {
                ElevatedCard(Modifier.fillMaxWidth(), RoundedCornerShape(20.dp)) {
                    Column(Modifier.padding(18.dp)) {
                        Text("📺 קבל 100 מטבעות", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                        Text("בגרסת הבנייה הזאת הכפתור מדמה צפייה בפרסומת לצורך בדיקה.")
                        Spacer(Modifier.height(10.dp))
                        Button(onClick = { showAd = true }, Modifier.fillMaxWidth()) { Text("צפה בפרסומת +100") }
                    }
                }
            }
            item { Text("🎮 המשחקים", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Black) }
            items(games) { game ->
                val unlocked = store.isUnlocked(game.id)
                ElevatedCard(
                    Modifier.fillMaxWidth(), RoundedCornerShape(20.dp),
                    colors = CardDefaults.elevatedCardColors(containerColor = if (unlocked) MaterialTheme.colorScheme.surface else MaterialTheme.colorScheme.surfaceVariant)
                ) {
                    Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text(game.icon, style = MaterialTheme.typography.displaySmall)
                        Spacer(Modifier.width(14.dp))
                        Column(Modifier.weight(1f)) {
                            Text(game.title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                            Text(game.subtitle)
                        }
                        if (unlocked) {
                            Button(onClick = {
                                if (game.id == "tictactoe") activeGame = game.id else message = "המשחק פתוח, והמשחק המלא שלו יתווסף בעדכון הבא."
                            }) { Text("שחק") }
                        } else {
                            Button(onClick = {
                                if (store.spendCoins(GAME_PRICE)) {
                                    store.unlock(game.id); refresh(); message = "פתחת את ${game.title}! 🎉"
                                } else message = "צריך 3,000 מטבעות כדי לפתוח את המשחק."
                            }) { Text("🔒 $GAME_PRICE") }
                        }
                    }
                }
            }
            if (message.isNotBlank()) {
                item {
                    Card(RoundedCornerShape(16.dp)) {
                        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text(message, Modifier.weight(1f), fontWeight = FontWeight.SemiBold)
                            OutlinedButton(onClick = { message = "" }) { Text("סגור") }
                        }
                    }
                }
            }
            item { Spacer(Modifier.height(12.dp)) }
        }
    }

    if (showAd) {
        FakeAdDialog(
            onComplete = { store.addCoins(AD_REWARD); refresh(); showAd = false; message = "קיבלת $AD_REWARD מטבעות! 🪙" },
            onCancel = { showAd = false }
        )
    }
}

@Composable
private fun RewardCard(icon: String, label: String, reward: String, modifier: Modifier) {
    Card(modifier, RoundedCornerShape(18.dp)) {
        Column(Modifier.padding(14.dp)) {
            Text(icon, style = MaterialTheme.typography.headlineSmall)
            Text(label, fontWeight = FontWeight.SemiBold)
            Text(reward, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
        }
    }
}

@Composable
private fun FakeAdDialog(onComplete: () -> Unit, onCancel: () -> Unit) {
    var seconds by remember { mutableIntStateOf(5) }
    LaunchedEffect(Unit) {
        while (seconds > 0) { delay(1000); seconds-- }
    }
    AlertDialog(
        onDismissRequest = onCancel,
        title = { Text("📺 פרסומת") },
        text = { Text(if (seconds > 0) "הפרסומת מסתיימת בעוד $seconds שניות…" else "הפרסומת הסתיימה. קבל 100 מטבעות!") },
        confirmButton = { Button(onClick = onComplete, enabled = seconds == 0) { Text("קבל 100 מטבעות") } },
        dismissButton = { OutlinedButton(onClick = onCancel) { Text("ביטול") } }
    )
}

@Composable
private fun TicTacToeScreen(onBack: () -> Unit, onWin: () -> Unit, message: String, onMessageClear: () -> Unit) {
    var board by remember { mutableStateOf(List(9) { "" }) }
    var turn by remember { mutableStateOf("X") }
    var gameOver by remember { mutableStateOf(false) }
    var result by remember { mutableStateOf<String?>(null) }

    fun winner(b: List<String>): String? {
        val lines = listOf(listOf(0,1,2), listOf(3,4,5), listOf(6,7,8), listOf(0,3,6), listOf(1,4,7), listOf(2,5,8), listOf(0,4,8), listOf(2,4,6))
        for (line in lines) {
            val a = b[line[0]]
            if (a.isNotEmpty() && a == b[line[1]] && a == b[line[2]]) return a
        }
        return if (b.none { it.isEmpty() }) "DRAW" else null
    }

    fun reset() {
        board = List(9) { "" }; turn = "X"; gameOver = false; result = null; onMessageClear()
    }

    fun makeMove(index: Int) {
        if (gameOver || board[index].isNotEmpty() || turn != "X") return
        board = board.toMutableList().also { it[index] = "X" }
        when (winner(board)) {
            "X" -> { gameOver = true; result = "ניצחת!"; onWin(); return }
            "DRAW" -> { gameOver = true; result = "תיקו"; return }
        }
        turn = "O"
        val available = board.indices.filter { board[it].isEmpty() }
        val aiIndex = if (available.contains(4)) 4 else available.randomOrNull()
        if (aiIndex != null) {
            board = board.toMutableList().also { it[aiIndex] = "O" }
            when (winner(board)) {
                "O" -> { gameOver = true; result = "המחשב ניצח" }
                "DRAW" -> { gameOver = true; result = "תיקו" }
                else -> turn = "X"
            }
        }
    }

    Scaffold(
        topBar = { TopAppBar(title = { Text("❌⭕ איקס עיגול", fontWeight = FontWeight.ExtraBold) }, navigationIcon = { OutlinedButton(onClick = onBack, Modifier.padding(start = 8.dp)) { Text("חזור") } }) }
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text("ניצחון = +50 מטבעות 🪙", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(8.dp))
            Text(if (!gameOver) "התור שלך — X" else result.orEmpty(), style = MaterialTheme.typography.titleLarge)
            Spacer(Modifier.height(18.dp))
            for (r in 0..2) {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    for (c in 0..2) {
                        val i = r * 3 + c
                        Box(
                            Modifier.size(95.dp).background(
                                Brush.verticalGradient(listOf(MaterialTheme.colorScheme.primaryContainer, MaterialTheme.colorScheme.secondaryContainer)), RoundedCornerShape(18.dp)
                            ).clickable { makeMove(i) },
                            contentAlignment = Alignment.Center
                        ) { Text(board[i], style = MaterialTheme.typography.displaySmall, fontWeight = FontWeight.Black) }
                    }
                }
                Spacer(Modifier.height(10.dp))
            }
            Spacer(Modifier.height(14.dp))
            Button(onClick = ::reset, Modifier.fillMaxWidth()) { Text("משחק חדש") }
            AnimatedVisibility(message.isNotBlank()) {
                Card(Modifier.padding(top = 14.dp), RoundedCornerShape(16.dp)) { Text(message, Modifier.padding(14.dp), fontWeight = FontWeight.Bold) }
            }
        }
    }
}
