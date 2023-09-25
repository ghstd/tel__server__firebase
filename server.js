import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import { initializeApp } from "firebase/app"
import { deleteDoc, doc, getFirestore, setDoc } from "firebase/firestore"
import { collection, getDoc, getDocs } from "firebase/firestore"

const app = express()
const port = 3000

const firebaseConfig = {
	apiKey: 'AIzaSyCGnldTTzX4B7iX3VjSxqR7uermqn5igHc',
	authDomain: "tebot-db.firebaseapp.com",
	projectId: "tebot-db",
	storageBucket: "tebot-db.appspot.com",
	messagingSenderId: "521819380591",
	appId: "1:521819380591:web:6e2c31fcf65ac6235ce69a"
}
const fireBaseApp = initializeApp(firebaseConfig)
const db = getFirestore(fireBaseApp)

app.use(express.json())

app.get('/', (req, res) => {
	res.send('Hello World!')
})

// Add ==================================

app.post('/dbAddUser', async (req, res) => {
	const user = req.body
	try {
		await setDoc(doc(db, 'users', `${user.id}`), {
			id: user.id,
			name: user.name,
			sessions: [],
			activeSession: null
		})
		res.send('user added')
	} catch (e) {
		console.log('in db request: ', e)
	}
})

app.post('/dbAddSession', async (req, res) => {
	const players = req.body

	const sessionId = uuidv4()
	const player_1Id = uuidv4()
	const player_2Id = uuidv4()
	try {
		await setDoc(doc(db, 'sessions', `${sessionId}`), {
			id: sessionId,
			movesCount: 1,
			players: [player_1Id, player_2Id]
		})

		await setDoc(doc(db, 'players', `${player_1Id}`), {
			...players[0],
			id: player_1Id,
			session: sessionId,
			playerField: JSON.stringify(players[0].playerField),
			targetField: JSON.stringify(players[0].targetField)
		})

		await setDoc(doc(db, 'players', `${player_2Id}`), {
			...players[1],
			id: player_2Id,
			session: sessionId,
			playerField: JSON.stringify(players[1].playerField),
			targetField: JSON.stringify(players[1].targetField)
		})

		const addedSession = await dbGetSession(sessionId)
		res.send(addedSession)
	} catch (e) {
		console.log('in db request: ', e)
	}
})

// Get ==================================

app.post('/dbGetSession', async (req, res) => {
	const id = req.body
	try {
		const sessionSnap = await getDoc(doc(db, 'sessions', `${id}`))
		const session = sessionSnap.data()
		const players = []

		session.players.forEach(async (id) => {
			const playerSnap = await getDoc(doc(db, 'players', `${id}`))
			const player = playerSnap.data()
			players.push({
				...player,
				playerField: JSON.parse(player.playerField),
				targetField: JSON.parse(player.targetField)
			})
		})
		res.send({ ...session, players })
	} catch (e) {
		console.log('in db request: ', e)
	}
})

app.post('/dbGetAllUsers', async (req, res) => {
	try {
		const querySnapshot = await getDocs(collection(db, "users"))
		const result = []
		querySnapshot.forEach((doc) => {
			result.push(doc.data())
		})
		res.send(result)
	} catch (e) {
		console.log('in db request: ', e)
	}
})

app.post('/dbGetUser', async (req, res) => {
	const id = req.body
	try {
		const docSnap = await getDoc(doc(db, 'users', `${id}`))
		res.send(docSnap.data())
	} catch (e) {
		console.log('in db request: ', e)
	}
})

app.post('/dbGetPlayerByUserId', async (req, res) => {
	const id = req.body
	try {
		const user = await dbGetUser(id)
		const session = await dbGetSession(user.activeSession)
		const sessionPlayer = session.players.find((player) => player.userId === id)
		const player = await dbGetPlayer(sessionPlayer.id)
		res.send(player)
	} catch (e) {
		console.log('in db request: ', e)
	}
})

app.post('/dbGetPlayer', async (req, res) => {
	const id = req.body
	try {
		const playerSnap = await getDoc(doc(db, 'players', `${id}`))
		const player = playerSnap.data()

		const sessionSnap = await getDoc(doc(db, 'sessions', `${player.session}`))
		const session = sessionSnap.data()

		res.send({
			...player
			, session,
			playerField: JSON.parse(player.playerField),
			targetField: JSON.parse(player.targetField)
		})
	} catch (e) {
		console.log('in db request: ', e)
	}
})

// Update ==================================

app.post('/dbUpdateSessionMovesCount', async (req, res) => {
	const { id, movesCount } = req.body
	try {
		await setDoc(doc(db, 'sessions', `${id}`), { movesCount }, { merge: true })
		const result = await dbGetSession(id)
		res.send(result)
	} catch (e) {
		console.log('in db request: ', e)
	}
})

app.post('/dbUpdatePlayerField', async (req, res) => {
	const { id, playerField } = req.body
	try {
		await setDoc(doc(db, 'players', `${id}`), { playerField }, { merge: true })
		const result = await dbGetPlayer(id)
		res.send(result)
	} catch (e) {
		console.log('in db request: ', e)
	}
})

app.post('/dbUpdatePlayerTargetField', async (req, res) => {
	const { id, targetField } = req.body
	try {
		await setDoc(doc(db, 'players', `${id}`), { targetField }, { merge: true })
		const result = await dbGetPlayer(id)
		res.send(result)
	} catch (e) {
		console.log('in db request: ', e)
	}
})

app.post('/dbUpdatePlayerReady', async (req, res) => {
	const { id, ready } = req.body
	try {
		await setDoc(doc(db, 'players', `${id}`), { ready }, { merge: true })
		const result = await dbGetPlayer(id)
		res.send(result)
	} catch (e) {
		console.log('in db request: ', e)
	}
})

app.post('/dbUpdateUser', async (req, res) => {
	const { id, sessionId } = req.body
	try {
		const user = await dbGetUser(id)
		user.activeSession = sessionId
		user.sessions.push(sessionId)
		await setDoc(doc(db, 'users', `${id}`), { sessions: user.sessions, activeSession: user.activeSession }, { merge: true })
		res.send(user)
	} catch (e) {
		console.log('in db request: ', e)
	}
})

// Delete ==================================

app.post('/dbDeleteSessionFromUser', async (req, res) => {
	const { id, sessionId } = req.body
	try {
		const user = await dbGetUser(id)
		user.sessions = user.sessions.filter((sesId) => sesId !== sessionId)
		user.activeSession = user.sessions[0] ? user.sessions[0] : null
		await setDoc(doc(db, 'users', `${id}`), { sessions: user.sessions, activeSession: user.activeSession }, { merge: true })
		res.send('session deleted from user')
	} catch (e) {
		console.log('in db request: ', e)
	}
})

app.post('/dbDeletePlayer', async (req, res) => {
	const id = req.body
	try {
		await deleteDoc(doc(db, 'players', `${id}`))
		res.send('player deleted')
	} catch (e) {
		console.log('in db request: ', e)
	}
})

app.post('/dbDeleteSession', async (req, res) => {
	const id = req.body
	try {
		await deleteDoc(doc(db, 'sessions', `${id}`))
		res.send('session deleted')
	} catch (e) {
		console.log('in db request: ', e)
	}
})



app.listen(port, () => {
	console.log(`server started on port ${port}`)
})
