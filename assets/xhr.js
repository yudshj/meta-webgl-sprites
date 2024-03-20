// Copyright 2004-present Facebook. All Rights Reserved.

// Licensed under the Apache License, Version 2.0 (the "License"); you may
// not use this file except in compliance with the License. You may obtain
// a copy of the License at

//     http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
// License for the specific language governing permissions and limitations
// under the License.

var Xhr = (function() {
    var socket;

    function init() {
      if (stand_alone) {
        return;
      }
      var options = {transports: ['xhr-polling']};
      socket = io.connect("http://localhost:8081", options);

      socket.on('message', function(data) {
          data = JSON.parse(data.replace('<', '&lt;').replace('>', '&gt;'));
          for (var i = 0, len = data.cmds.length; i < len; i++) {
            ClientCmd.exec(data.cmds[i]);
          }
        });
    }

    function toServer(cmd) {
      if (stand_alone) {
         return;
      }
      console.log('sent cmd: '+JSON.stringify(cmd));
      var unique_id = client_user.unique_id;
      var script = document.createElement('script');
      var req_id = 'id' + unique_id + (new Date).getTime();
      socket.send(JSON.stringify({user_id: unique_id, req_id: req_id, cmd: cmd}));
    }

    function test() 	{
      var uuid = Utils.uuidv4();
      GridClient.add({extent: [[0, 0], [1, 2]], uuid: uuid});

    }

    var Xhr = {};
    Xhr.toServer = toServer;
    Xhr.test = test;
    Xhr.init = init;
    return Xhr;
  })();
