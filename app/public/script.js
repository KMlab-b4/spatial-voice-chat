const Peer = window.Peer;
const socketio = io();

let id_value = '';
let before_id = '';
let myPosition = {
  id: '', // stream.peerId からskyway側のpeerIdをもらえる
  x: '',
  y: '',
  uid: '',
  name: ''
};
const audioContext = new AudioContext();
var gainNodes = [];
var muteFlag = false;

(async function main() {
  const localVideo = document.getElementById('js-local-stream');
  const joinTrigger = document.getElementById('js-join-trigger');
  const leaveTrigger = document.getElementById('js-leave-trigger');
  const remoteVideos = document.getElementById('js-remote-streams');
  const roomId = document.getElementById('js-room-id');
  const roomMode = document.getElementById('js-room-mode');
  const localText = document.getElementById('js-local-text');
  const sendTrigger = document.getElementById('js-send-trigger');
  const messages = document.getElementById('js-messages');
  const meta = document.getElementById('js-meta');
  const sdkSrc = document.querySelector('script[src*=skyway]');
  // new
  const userName = document.getElementById('js-username');
  const confirmCreate = document.getElementById('js-confirm-create-trigger');
  const confirmJoin = document.getElementById('js-confirm-join-trigger');
  const entranceSetting = document.getElementById('js-entrance-setting-trigger');
  const muteBtn = document.getElementById('js-mute-trigger');
  const roomSetting = document.getElementById('js-room-setting-trigger');
  const returnEntrance = document.getElementById('js-return-entrance-trigger');
  const returnRoom = document.getElementById('js-return-room-trigger');
  const returnConfirm = document.getElementById('js-return-trigger');

  //webaudio
  

  meta.innerText = `
    UA: ${navigator.userAgent}
    SDK: ${sdkSrc ? sdkSrc.src : 'unknown'}
  `.trim();

  //const getRoomModeByHash = () => (location.hash === '#sfu' ? 'sfu' : 'mesh');
  const getRoomModeByHash = () => (location.hash === 'sfu');

  roomMode.textContent = getRoomModeByHash();
  window.addEventListener(
    'hashchange',
    () => (roomMode.textContent = getRoomModeByHash())
  );

  const localStream = await navigator.mediaDevices
    .getUserMedia({
      audio: true,
      video: false,
    })
    .catch(console.error);

  // Render local stream
  localVideo.muted = true;
  localVideo.srcObject = localStream;
  localVideo.playsInline = true;
  await localVideo.play().catch(console.error);

  // eslint-disable-next-line require-atomic-updates
  //
  const peer = (window.peer = new Peer({
  //  key: window.__SKYWAY_KEY__,
//    key: 'd0292763-ff35-4514-9d7e-2347ffe2068c',
    key: '8d501eb9-c573-41f4-9279-20e975f10712',
    /*
    debug の数字の意味
    0:none
    1:error
    2:warning
    3:full
    */
    debug: 3,
  }));

  confirmCreate.addEventListener('click', () => {
    document.getElementById('js-entrance').style.display = "none";
    document.getElementById('js-confirm').style.display = "inline-block";
  });
  confirmJoin.addEventListener('click', () => {
    document.getElementById('js-entrance').style.display = "none";
    document.getElementById('js-confirm').style.display = "inline-block";
  });
  entranceSetting.addEventListener('click', () => {
    document.getElementById('js-entrance').style.display = "none";
    document.getElementById('js-setting').style.display = "inline-block";
  });
  roomSetting.addEventListener('click', () => {
    document.getElementById('js-container').style.display = "none";
    document.getElementById('js-setting').style.display = "inline-block";
  });
  returnEntrance.addEventListener('click', () => {
    document.getElementById('js-setting').style.display = "none";
    document.getElementById('js-entrance').style.display = "inline-block";
  });
  returnRoom.addEventListener('click', () => {
    document.getElementById('js-setting').style.display = "none";
    document.getElementById('js-container').style.display = "inline-block";
  });
  returnConfirm.addEventListener('click', () => {
    document.getElementById('js-confirm').style.display = "none";
    document.getElementById('js-entrance').style.display = "inline-block";
  });

  // Register join handler
  // 結合ハンドラを登録する
  joinTrigger.addEventListener('click', () => {
    // Note that you need to ensure the peer has connected to signaling server
    // before using methods of peer instance.
    // ピアインスタンスをメゾットする前
    // ピアがシグナリングサーバに接続していることを
    // 確認する必要があることに注意してください
    if (!peer.open) {
      return;
    }

    //audioContextの再呼び出し
    audioContext.resume();

    // 表示の切り替え
    document.getElementById('js-confirm').style.display = "none";
    document.getElementById('js-container').style.display = "inline-block";

    let data = JSON.stringify({ name: userName.value, room: roomId.value, });
    socketio.emit('join', data);
    myPosition.id = peer.id;
    myPosition.name = userName.value;


    // 部屋に参加する
    //
    const room = peer.joinRoom(roomId.value, {
      mode: getRoomModeByHash(),
      stream: localStream,
    });

    

    // 新規に Peer がルームへ入室したときに発生
    room.once('open', () => {
      messages.textContent += '=== You joined ===\n';
    });
    // ルームに新しい Peer が参加したときに発生
    // ここで最初に出てくるpeerIDは参加者のID
    // userNameの値(userName.value)と宣言しなければ動かない
    room.on('peerJoin', peerId => {
      messages.textContent += `=== ${userName.value} joined ===\n`;
    });

    // Render remote stream for new peer join in the room
    // ルームでの新しいピア参加のためにリモートストリームをレンダリング（与える）します
    // ルームに Join している他のユーザの
    // ストリームを受信した時に発生
    room.on('stream', async stream => {
      //new 音量変更nodeを配列に保存
      gainNodes.push(createGainNode(stream));

      const newVideo = document.createElement('audio');//video');
      newVideo.srcObject = stream;
      newVideo.playsInline = true;

      //new videoをmute
      newVideo.muted = true;

      // mark peerId to find it later at peerLeave event
      // peerIDをマークして、後でpeerLeaveイベントで見つける
      newVideo.setAttribute('data-peer-id', stream.peerId);
      remoteVideos.append(newVideo);
      await newVideo.play().catch(console.error);
    });

    // 他のユーザーから送信されたデータを受信した時に発生
    room.on('data', ({ data, src }) => {
      // Show a message sent to the room and who sent
      // 部屋に送信されたメッセージと送信者の表示
      messages.textContent += `${src}: ${data}\n`;
    });

    // for closing room members
    // 新規にpeerがルームを退出したときに発生
    // ここで最初に出てくるpeerIDは退出したpeerのID
    room.on('peerLeave', peerId => {
      const remoteVideo = remoteVideos.querySelector(
        `[data-peer-id="${peerId}"]`
      );
      remoteVideo.srcObject.getTracks().forEach(track => track.stop());
      remoteVideo.srcObject = null;
      remoteVideo.remove();
      for(let i = 0; i < gainNodes.length; i++){
        if(gainNodes[i].id == peerId){
          gainNodes.splice(i, 1);
          break;
        }
      }

      messages.textContent += `=== ${userName.value} left ===\n`;
    });

    // for closing myself
    // ルームを閉じたときに発生するイベント
    room.once('close', () => {
      sendTrigger.removeEventListener('click', onClickSend);
      messages.textContent += '== You left ===\n';
      Array.from(remoteVideos.children).forEach(remoteVideo => {
        remoteVideo.srcObject.getTracks().forEach(track => track.stop());
        remoteVideo.srcObject = null;
        remoteVideo.remove();
      });
    });

    sendTrigger.addEventListener('click', onClickSend);
    
    leaveTrigger.addEventListener('click', () => {
      room.close()
      document.getElementById('js-entrance').style.display = "inline-block";
      document.getElementById('js-container').style.display = "none";
      roomId.value = '';
      userName.value = '';
      gainNodes = [];
    }, { once: true });

    function onClickSend() {
      // Send message to all of the peers in the room via websocket
      // WebSocketを介して部屋のすべてのピアにメッセージを送信します
      room.send(localText.value);

      
      //messages.textContent += `${peer.id}: ${localText.value}\n`;
      messages.textContent += `${userName.value}: ${localText.value}\n`;
      localText.value = '';
    }
  });

  //new
  muteBtn.addEventListener('click', () => {
    allMute();
  });

  peer.on('error', console.error);
})();

$(function(){
  $('#message_form').submit(function(){
    socketio.emit('message', $('#input_msg').val());
    $('#input_msg').val('');
    return false;
  });

  socketio.on('join', (msg) => {
    console.log('join:'+msg+":"+myPosition.name);
    data = JSON.parse(msg);
    if (myPosition.name === data.name) myPosition.uid = data.uid;
  });

  socketio.on('move', (msg) => {
    console.log(msg);

    let data = JSON.parse(msg);

    if (data.before_id) {
      let beforeBackgroundImageUrl = document.getElementById(data.before_id).style.backgroundImage;
      if (beforeBackgroundImageUrl === ('url("img/' + data.uid+'.jpg")')) {
        document.getElementById(data.before_id).style.backgroundImage = "url(img/none.jpg)";
      }
      document.getElementById(data.id_value).style.backgroundImage = "url(img/" + data.uid + ".jpg)";
      if(myPosition.name != data.name)changeVolume(data);
    } else {
      document.getElementById(data.id_value).style.backgroundImage = "url(img/" + data.uid + ".jpg)";
      if(myPosition.name != data.name)changeVolume(data);
    }
  });

  socketio.on('message', (msg) => {
    console.log(msg);
  });

})

function changeVolume(data) {
  x = myPosition.x - data.x;
  y = myPosition.y - data.y;
  ans = x*x + y*y;
  console.log('distance:'+ans);
  console.log(myPosition.name+':'+data.name)
  // 音量の変更
  for(let i = 0; i < gainNodes.length; i++){
    if(gainNodes[i].id == data.peerId){
      gainNodes[i].volume = 1/ans;
      if(!muteFlag){
        gainNodes[i].node.gain.value = gainNodes[i].volume;
      }
      break;
    }
  }
}

function moveObject(element) {
  console.log(element.style.backgroundImage);
  if (element.style.backgroundImage === '' || element.style.backgroundImage === 'url("img/none.jpg")') {
    before_id = id_value;
    id_value = element.id;
    getPosition(element);
    let data = JSON.stringify({
      name: myPosition.name,
      id_value: id_value,
      before_id: before_id,
      x: myPosition.x,
      y: myPosition.y,
      peerId: myPosition.id,
      uid: myPosition.uid
    });
    socketio.emit('move', data);
  }
}

function getPosition(element) {
  myPosition.x = Number(element.id) % 10;
  myPosition.y = parseInt(Number(element.id) / 10);
}


function createGainNode(stream) {
  const gainNode = audioContext.createGain();
  const source = audioContext.createMediaStreamSource(stream);
  source.connect(gainNode);
  gainNode.connect(audioContext.destination);
  gainNode.gain.value =0;

  return {id: stream.peerId, node: gainNode, volume: 0};
}

function allMute() {
  for(let i = 0; i < gainNodes.length; i++){
    if(!muteFlag){
      gainNodes[i].node.gain.value = 0;
    }else{
      gainNodes[i].node.gain.value = gainNodes[i].volume;
    }
  }
  muteFlag = !muteFlag;
}



/*
none.jpgの準備
*/