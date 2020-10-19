const Peer = window.Peer;
const socketio = io();

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

  //webaudio
  const audioContext = new AudioContext();
  var gainNodes = [];

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
      video: true,
    })
    .catch(console.error);

  // Render local stream
  localVideo.muted = true;
  localVideo.srcObject = localStream;
  localVideo.playsInline = true;
  await localVideo.play().catch(console.error);

  // 音声のみミュート //追記:音声のみミュートはlocalVideo.muted = true; で為されているので不要
  //localStream.getAudioTracks().forEach((track) => (track.enabled = false));

  // eslint-disable-next-line require-atomic-updates
  //
  const peer = (window.peer = new Peer({
  //  key: window.__SKYWAY_KEY__,
    key: 'd0292763-ff35-4514-9d7e-2347ffe2068c',
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
      gainNodes.push(createGainNode(audioContext, stream));

      const newVideo = document.createElement('video');
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
      document.getElementById('js-confirm').style.display = "inline-block";
      document.getElementById('js-container').style.display = "none";
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
    allMute(gainNodes);
  });

  peer.on('error', console.error);
})();

$(function(){
  $('#message_form').submit(function(){
    socketio.emit('message', $('#input_msg').val());
    $('#input_msg').val('');
    return false;
  })
})