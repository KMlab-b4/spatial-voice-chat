let express = require('express');
let app = express();
let http = require('http').Server(app);
let Canvas = require('canvas');
let fs = require('fs');
let dataUriToBuffer = require('data-uri-to-buffer');
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

		image = createIcon();

		data = JSON.stringify({
			name: store.name,
			uid: store.id,
		});
		io.emit('join', data);
		console.log('join to ' + store.room + ' with ' + store.name + ':' + store.id);
	});

	socket.on('move', (msg) => {
		console.log('move: ' + msg);
		io.emit('move', msg);
	})

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

function createIcon () {
	let canvas = Canvas.createCanvas(100, 100);
	let ctx = canvas.getContext('2d');

	ctx.arc(50,50,50,0*Math.PI/180,360*Math.PI/180,false);
	ctx.fillStyle = 'rgba(0,0,255,0.5)';
	ctx.fill();
	ctx.font = '10px Impact';
	ctx.fillStyle = 'rgba(0,0,0,1.0)';
	ctx.fillText(store.name, (100-ctx.measureText(store.name).width)/2, 50);

	let canvasDataUrl = canvas.toDataURL();
	let decoded = dataUriToBuffer(canvasDataUrl);
	save = __dirname + '/public/img/' + store.id + '.jpg';
	fs.writeFile(save, decoded, (err) => {
		if(err) console.log(`error!::${err}`);
	});
	console.log('create!!')

	return canvasDataUrl;
}