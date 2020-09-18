let name = prompt('名前を入力してください');
let socketio = io();

$('#message_form').submit(function(){
  let data = JSON.stringify({ name:name, message:$('#input_msg').val(), action:'chat' });
  socketio.emit('message', data);
  $('#input_msg').val('');
  return false;
});

socketio.on('message', function(msg){
    let data = JSON.parse(msg);
    switch(data.action) {
    case 'mousemove':
      $('#box-x').text('X: ' + data.x);
      $('#box-y').text('Y: ' + data.y);
      $('#mine').css('left', data.x);
      $('#mine').css('top', data.y);
      break;
    case 'chat':
      $('#messages').append($('<p>').text( data.name + ' : ' + data.message));
      break;
    }
});