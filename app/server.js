let express = require('express');
let app = express();
let http = require('http').Server(app);
const io = require('socket.io')(http);
const PORT = process.env.PORT || 8080;

app.use( express.static(__dirname + '/public'));

io.on('connection', (socket) => {

	store = {
		name: '',
		room: '',
		id: ''
	};
	
	socket.on('join', (msg) => {
		data = JSON.parse(msg);
		store.name = data.name;
		store.room = data.room;
		store.id = socket.id;
		io.emit('message', store.room + '<=' + store.id + ' : ' + store.name + ' : 入室 ');
		console.log('join to ' + store.room + ' with ' + store.name + ':' + store.id);
	});

	socket.on('message', (msg) => {
		console.log('message: ' + msg);
		io.emit('message', msg);
	});

	socket.on('disconnect', () => {
		console.log(socket.id + ' is disconnected.');
	});
});

http.listen(PORT, () => {
	console.log('server listening. PORT:' + PORT);
});
