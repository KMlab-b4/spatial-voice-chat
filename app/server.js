let express = require('express');
let app = express();
let http = require('http').Server(app);
const io = require('socket.io')(http);
const PORT = process.env.PORT || 8080;

app.use( express.static(__dirname + '/public'));

io.on('connection', (socket) => {
	socket.on('message', (msg) => {
		console.log('message: ' + msg);
		io.emit('message', msg);
	});
});

http.listen(PORT, () => {
	console.log('server listening. PORT:' + PORT);
});
