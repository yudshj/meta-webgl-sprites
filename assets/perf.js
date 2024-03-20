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

var Perf = (function() {
    function resetSession() {
      client_user.unique_id = 0;
    }

    function startSession(id, app_id) {
      client_user.unique_id = id;
      client_user.app_id = app_id;
      Init.reset();
    }

    function startPerfTest() {
      PerfTest.init();
      PerfTest.doAll();
    }

    function stopPerfTest() {
      PerfTest.stop();
    }

    function showDetails(data) {
      if (UI.exists('details')) {
        UI.del('details');
      }
      else {
        UI.del('details');
        UI.addCollection('perf', 'details', {uiclass: 'perfblock', pos: [265, 0], width: 1000, height: 4000});

        var param_on_scores = {};
        var param_off_scores = {};
        var subscores = data.details;
        var stats = '';
        for (var rm in subscores) {
          for (var sp in subscores[rm]) {
            switch(rm) {
              case 'canvas':
                stats += '&lt;canvas&gt;';
                break;
              case 'html':
                stats += '&lt;div&gt;'
                  break;
              case 'webgl':
                stats += 'webgl';
                break;
            }
            stats += ' ' + (sp == 'aa' ? 'axis-aligned images' : 'rotated images') + '<br />';

            var sorted = [];
            for (var s in  subscores[rm][sp]) {
              sorted.push({path:subscores[rm][sp][s].path, score:subscores[rm][sp][s].score});
            }

            sorted.sort(function(a,b) {return b.score - a.score;});

            var max = sorted[0].score;

            for (var i=0,len=sorted.length;i<len;i++) {
              var s = sorted[i].path;
              var sub = s.split(/[\: ]/);
              var percent_penalty = parseInt((max-sorted[i].score)/max*100);
              stats += (s == 0 ? '<b>' : '') + sorted[i].score + ' (-'+percent_penalty+'\%) ';

              for (var det = 0, dlen = sub.length-1; det < dlen; det += 2) {
                if (sub[det + 1] == 'true') {
                  if (param_on_scores[sub[det]]) {
                    param_on_scores[sub[det]].total += percent_penalty;
                    param_on_scores[sub[det]].count += 1;
                  } else {
                    param_on_scores[sub[det]] = {total:percent_penalty,count:1};
                  }
                } else {
                  if (param_off_scores[sub[det]]) {
                    param_off_scores[sub[det]].total += percent_penalty;
                    param_off_scores[sub[det]].count += 1;
                  } else {
                    param_off_scores[sub[det]] = {total:percent_penalty,count:1};
                  }
                }
                switch (sub[det]) {
                  case 'canvas_background':
                    if (sub[det + 1] == 'true') {
                      stats += 'sprites drawn with ctx.drawImage in &lt;canvas&gt; over a &lt;canvas&gt; background ';
                    } else {
                      stats += 'sprites drawn with ctx.drawImage in &lt;canvas&gt; over a &lt;div&gt; background ';
                    }
                    break;
                  case 'update_existing':
                    if (sub[det + 1] == 'true') {
                      stats += 'dom update ';
                    } else {
                      stats += 'innerHTML ';
                    }
                    break;
                  case 'use_div_background':
                    if (sub[det + 1] == 'true') {
                      stats += 'div with background  ';
                    } else {
                      stats += 'div masking img ';
                    }
                    break;
                  case 'css_transitions':
                    if (sub[det + 1] == 'true') {
                      stats += 'css transition ';
                    }
                    break;
                  case 'sprite_sheets':
                    if (sub[det + 1] == 'true') {
                      stats += 'sprite sheets ';
                    } else {
                      stats += 'individual sprites ';
                    }
                    break;
                  case 'int_snap':
                    if (sub[det + 1] == 'true') {
                      stats += 'ints ';
                    }
                    break;
                  case 'transform3d':
                    if (sub[det + 1] == 'true') {
                      stats += '3d ';
                    }
                    break;
                  case 'css_keyframe':
                    if (sub[det + 1] == 'true') {
                      stats += 'css keyframe ';
                    }
                    break;
                  case 'multi':
                    stats += 'multi ' + sub[det + 1] + " ";
                    break;
                }
              }
              stats += (s == 0 ? '</b>' : '') + '<br />';
            }
            stats += '<br />';
          }
        }
        var b = data.browser;
        var browser = b.match(/(\w+) \d+/);
        if (browser) {
          browser = browser[1];
        } else {
          browser = b;
        }
        UI.addHTML('details', 'dbrowserdet', {pos: [5, 4], uiclass: 'browsername', markup: b});
        var score = 'Max reported score: ' + parseInt(data.peak) + ' sprites';
        UI.addHTML('details', 'dperfscore', {pos: [3, 24], uiclass: 'perfscore', markup: score});
        score = parseInt(data.total / data.count);
        stats += '<br />"dom update": update values in dom object when sprites move<br />"innerHTML": rebuild scene each frame when sprites move<br />"div with background": animating sprites are a div element with changing offsets on background image<br />';
        stats += '"div masking img": animating sprites are a div element masking img element<br />"rotate": use css transform property for rotation, left/top for position of sprites<br />"transform": use css transform property for rotation and position of sprites<br />';
        stats += '"css transition": use css transition to rather than updating every frame<br />"sprite sheets": combine animating sprites into sprite sheets<br />';
        stats += '"int": snap sprite positions to integer values<br />"3d": use 3d transforms where possible<br />"css keyframe":use css animation to keyframe sprite animation<br /><br />';

        var deltas = [];
        for (var p in param_on_scores) {
          if (param_off_scores[p])
            deltas.push({param:p,delta:parseInt(param_off_scores[p].total/param_off_scores[p].count - param_on_scores[p].total/param_on_scores[p].count)});
        }
        deltas.sort(function(a,b) {return b.delta - a.delta;});

        stats += 'impact of turning off <br />';

        for (p=0;p<deltas.length;p++) {
          stats += deltas[p].param + ':' + deltas[p].delta+'\%<br />';
        }

        UI.addHTML('details', 'detailinfo', {pos: [5, 105], uiclass: 'renderdetails', markup: stats});
      }
    }

    // Score reporting
    function getBrowser() {
      var b = data.browser;
      var browser = b.match(/(\w+) \d+/);
      if (browser) {
        browser = browser[1];
      } else {
        browser = b;
      }
    }

    function getScores() {
      var req = new XMLHttpRequest();
      req.open('GET', 'benchmark_results', true);
      req.onreadystatechange = function() {
        var result;
        var done = 4, ok = 200;
        if (req.readyState == done && req.status == ok) {
          result = JSON.parse(req.responseText);
          outputScoresAsync(result);
        }
      }
      req.send(null);
      return "Loading result history...";
    }

    // Super hacky and likely unsafe sanitization function
    // Still looking for the best way to sanitize strings in node.js
    function sanitize(string) {
      return string.replace(/[&<>]/g, '');
    }

    function outputScoresAsync(results) {
      var scoreTable;
      var maxResult;

      scoreTable='<table class="hpadding">';
      scoreTable+='<tr><th style="width:200px"></th><th>Score</th><th>Browser</th><th>Date</th></tr>';

      if (results.length>0) {
        maxResult = parseInt(results[0].score);
      }

      for (var i=0; i<results.length; i++) {
        var date = new Date(results[i].time).toDateString();
        var score = parseInt(results[i].score);
        var barWidth = score*100/maxResult;
        scoreTable+='<tr>';
        scoreTable+='<td><div class="bar" style="width:'+barWidth+'%;"></div></td>';
        scoreTable+='<td>'+score+'</td>';
        scoreTable+='<td>'+sanitize(Browser.detectFromUA(results[i].browser))+'</td>';
        scoreTable+='<td>'+sanitize(date)+'</td>';
        scoreTable+='</tr>';
      }
      scoreTable+='</table>';

      UI.addHTML('details', 'detailinfo', {pos: [5, 105], uiclass: 'renderdetails', markup: scoreTable});
    }

    function showHiscores() {
      UI.del('details');
      UI.addCollection('perf', 'details', {uiclass: 'perfblock', pos: [265, 0], width: 600, height: 1000});

      var score = 'All time high scores:';
      UI.addHTML('details', 'dperfscore', {pos: [3, 4], uiclass: 'perfscore', markup: score});

      getScores();
    }


    function canvasDemo() {
      UI.del('buttons');
      UI.del('perf');
      var sprite = Browser.mobile ? 'aahalf' : 'aa';
      var fps = Browser.mobile ? 20 : 30;

      for (var i=0;i<30;i++) {
        PerfTest.addTest(
          {
            viewport: 'fluid',
              settings:
            {
              render_mode: GameFrame.CANVAS_ONLY,
                sprite_sheets: false, int_snap: true,multi:i+1,
                canvas_background: false
                },
              tfps: fps, background: 'world', sprites: sprite, demo: false
              });
      }
      PerfTest.doAll();
    }

    function htmlDemo() {
      UI.del('buttons');
      UI.del('perf');
      var sprite = Browser.mobile ? 'aahalf' : 'aa';
      var fps = Browser.mobile ? 20 : 30;

      PerfTest.addTest(
        {
          viewport: 'fluid',
            settings:
          {
            render_mode: GameFrame.HTML_ONLY,
              sprite_sheets: false, int_snap: true,
              update_existing: true, use_div_background: true, multi_img: false,
              css_transitions: false, css_keyframe: false, transform3d: Browser.mobile ? true : false
              },
            tfps: fps, background: 'world', sprites: sprite, demo: false
            });
      PerfTest.doAll();
    }


    function memory_test_htmlDemo() {
      UI.del('buttons');
      UI.del('perf');
      var sprite = Browser.mobile ? 'aahalf' : 'aa';
      var fps = Browser.mobile ? 20 : 30;

      for (var i=0;i<20;i++) {
        PerfTest.addTest(
          {
            viewport: 'fluid',
              settings:
            {
              render_mode: GameFrame.HTML_ONLY,
                sprite_sheets: false, int_snap: true, multi: 1+i,
                update_existing: true, use_div_background: true, multi_img: false,
                css_transitions: false, css_keyframe: false, transform3d: Browser.mobile ? true : false
          },
              tfps: fps, background: 'world', sprites: sprite, demo: false
              });
      }
      PerfTest.doAll();
    }

    function webglDemo() {
      UI.del('buttons');
      UI.del('perf');
      PerfTest.addTest(
        {
          viewport: 'fluid',
          settings:
          {
              render_mode: GameFrame.WEBGL,
              sprite_sheets: true, int_snap: false,
              //disable_sprite_anim: true, sprite_url_override: 'images/white.png', sprite_scale: 0.01,
              disable_world_elements: true,
              webgl_debug: false, webgl_blended_canvas: false, webgl_batch_sprites: 5000
          },
          tfps: 30, background: 'world', sprites: 'rot', demo: true
        });
      PerfTest.doAll();
    }

    function webglSlowDemo() {
      UI.del('buttons');
      UI.del('perf');
      PerfTest.addTest(
        {
          viewport: 'fluid',
          settings:
          {
              render_mode: GameFrame.WEBGL,
              sprite_sheets: true, int_snap: false,
              //disable_sprite_anim: true, sprite_url_override: 'images/white.png', sprite_scale: 0.01,
              disable_world_elements: true,
              webgl_debug: false, webgl_blended_canvas: false, webgl_batch_sprites: 500
          },
          tfps: 30, background: 'world', sprites: 'rot', demo: true
        });
      PerfTest.doAll();
    }

    function iDemo() {
      UI.del('buttons');
      UI.del('perf');
      PerfTest.addTest({viewport: 'fluid', settings: {render_mode: GameFrame.HTML_ONLY, sprite_sheets: true, transform3d:true}, tfps: 20, background: 'world', sprites: 'igob', demo: true });
      PerfTest.doAll();
    }

    function rotDemo() {
      UI.del('buttons');
      UI.del('perf');
      UI.del('buttons');
      UI.del('perf');
      var sprite = 'rot';

      PerfTest.addTest(
        {
          viewport: 'fluid',
          settings:
          {
            render_mode: GameFrame.HTML_ONLY,
            sprite_sheets: false, int_snap: true,
            update_existing: true, use_div_background: true,
            css_transitions: false, css_keyframe: false, transform3d: false
          },
          tfps: 30, background: 'world', sprites: sprite, demo: true
        });
      PerfTest.doAll();
    }

    function scrollDemo() {
      UI.del('buttons');
      UI.del('perf');
      if (Browser.os == "Android") {
        UI.addScroll('', 'scroll', {pos: [0,82], width: 400, height: 600, sheight: 110, x: 10, y: 200});
      } else {
        UI.addScroll('', 'scroll', {pos: [0,82], width: 400, height: 600, sheight: 110, x: 10, y: 200});
      }
    }

    function playGame() {
      UI.del('buttons');
      UI.del('perf');

      Game.init({viewport: 'fluid', settings: {render_mode: GameFrame.CANVAS_ONLY, canvas_background: false}, tfps: 30, background: 'world', sprites: 'cute', demo: true, hack: true });

      PerfTest.doAll();
    }

    function playGameHTML() {
      UI.del('buttons');
      UI.del('perf');

      Game.init({viewport: 'fluid_width', settings: {render_mode: GameFrame.HTML_ONLY, update_existing: true, use_div_background: true, css_transitions: false, css_keyframe: false, sprite_sheets: false, int_snap: true, transform3d:false}, tfps: 30, background: 'world', sprites: 'cute', demo: true, hack: true });

      PerfTest.doAll();
    }

    function perfDisplay(data) {
      Init.winresize();
      UI.del('fps');
      UI.del('perf');
      UI.addCollection('', 'buttons', {pos: [0, 0]});
      UI.addButton('buttons', 'perftest', {pos: [5, 5], width: 95, height: 40, text: 'Start Test', command: {cmd: 'startperftest', args: []}});
      UI.addButton('buttons', 'htmldemo', {pos: [110, 5], width: 95, height: 40, text: 'HTML Demo', command: {cmd: 'htmldemo', args: []}});
      UI.addButton('buttons', 'canvasdemo', {pos: [215, 5], width: 95, height: 40, text: 'Canvas Demo', command: {cmd: 'canvasdemo', args: []}});
//      UI.addButton('buttons', 'scrollableddemo', {pos: [320, 5], width: 95, height: 40, text: 'Scroll Demo', command: {cmd: 'scrolldemo', args: []}});
      UI.addButton('buttons', 'webgldemo', {pos: [320, 5], width: 95, height: 40, text: 'WebGL Demo', command: {cmd: 'webgldemo', args: []}});
      UI.addButton('buttons', 'webglslowdemo', {pos: [425, 5], width: 105, height: 40, text: 'WebGL Demo 2', command: {cmd: 'webglslowdemo', args: []}});
//      UI.addButton('buttons', 'idemo', {pos: [530, 5], width: 95, height: 40, text: 'iPhone Demo', command: {cmd: 'idemo', args: []}});
//      UI.addButton('buttons', 'rotdemo', {pos: [635, 5], width: 95, height: 40, text: 'Rotate Demo', command: {cmd: 'rotdemo', args: []}});
      UI.addCollection(null, 'perf', {pos: [100, 60], width: 260});
      UI.addButton('buttons', 'hiscore', {pos: [540, 5], width: 95, height: 40, text: 'Hi-Scores', command: {cmd: 'showHiscores', args: []}});


      if (data) {
        for (var i = 0, len = data.length; i < len; i++) {
          UI.addCollection('perf', 'perfblock' + i, {uiclass: 'perfblock', pos: [0, 82 * i], height: 78, width: 260, command: {cmd:'showdetails', args:[data[i]]}});
          var b = Browser.browser_version || 'unknown';
          var browser = b.match(/(\w+) \d+/);
          if (browser) {
            browser = browser[1];
          } else {
            browser = b;
          }
          UI.addHTML('perfblock' + i, 'browserdet' + i, {pos: [5, 4], uiclass: 'browsername', markup: b});
          var score = parseInt(data[i].peak);
          UI.addHTML('perfblock' + i, 'perfscore' + i, {pos: [5, 24], uiclass: 'perfscore', markup: score});
        }

        // Display result browser
        showHiscores();
      }
    }

    function init() {
      Render.setupBrowserSpecific();
      GameFrame.settings.offset = 50;

      ClientCmd.install('resetsession', resetSession);
      ClientCmd.install('startsession', startSession);
      ClientCmd.install('startperftest', startPerfTest);
      ClientCmd.install('stopperftest', stopPerfTest);
      ClientCmd.install('canvasdemo', canvasDemo);
      ClientCmd.install('webgldemo', webglDemo);
      ClientCmd.install('webglslowdemo', webglSlowDemo);
      ClientCmd.install('htmldemo', htmlDemo);
      ClientCmd.install('idemo', iDemo);
      ClientCmd.install('rotdemo', rotDemo);
      ClientCmd.install('scrolldemo', scrollDemo);
      ClientCmd.install('showHiscores', showHiscores);
      ClientCmd.install('playgame', playGame);
      ClientCmd.install('playgamehtml', playGameHTML);
      ClientCmd.install('showdetails', showDetails);
      ClientCmd.install('perfdisplay', perfDisplay);
      Input.hookEvents('gamebody');
    }

    function setup() {
      ClientCmd.perfdisplay(null);
    }

    function teardown() {
      UI.del('fps');
      UI.del('perf');
      UI.del('buttons');
      UI.del('stoptest');
    }

    function quit() {
    }

    function tick() {
      Gob.movegobs(Tick.delta);
      Benchmark.tick();
    }

    var Perf = {};
    Perf.tick = tick;
    Perf.setup = setup;
    Perf.init = init;
    Perf.teardown = teardown;
    Perf.quit = quit;
    Perf.myscore = null;
    return Perf;
  })();

Init.setFunctions({app: Perf.tick, draw: Render.tick, ui: UI.tick, setup: Perf.setup, init: Perf.init, teardown: Perf.teardown, quit: Perf.quit});

