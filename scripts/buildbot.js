// Description:
//   Provides an interface to Buildbot v0.8.10
//
// Dependencies:
//   "cron": "^0.3.3",
//
// Configuration:
//   HUBOT_BUILDBOT_URL_NO_TRAILING_SLASH: url to buildbot server
//
// Commands:
//   hubot build <branch> on <builder>. <reason>
//   hubot build <branch> on <builder> with full on. <reason>
//   hubot buildbot auth <_oauthproxy cookie value> - update buildbot auth
//
// Author:
//   t.brown@wordstream.com

const querystring = require('querystring');
const sleep = require('sleep');

const BUILDBOT_URL = process.env.HUBOT_BUILDBOT_URL_NO_TRAILING_SLASH;
if (!BUILDBOT_URL) {
  console.log("no HUBOT_BUILDBOT_URL_NO_TRAILING_SLASH in environment: please set and try again");
  process.exit(1);
}
const DEBUG_LOGGING = process.env.HUBOT_DEBUG_LOGGING;
if (DEBUG_LOGGING) {
    console.log('debug logging ON');
}

const CRON_TIME_EVERY_10_SECONDS = '*/10 * * * * *';

const cronJob = require('cron').CronJob;

module.exports = function(robot) {

    let notifier;
    robot.respond(/build (.*) on ([^\s.]*)( ?[^\.]*)\.? ?(.*)/i, function(res) {
        // parse request
        const branch = res.match[1];
        const builder = res.match[2];
        const full_on_text = res.match[3];
        const reason_input = res.match[4];
        var checkbox = '',
            reason = reason_input,
            preRequestBuilderStatus = {};
        if (full_on_text.includes('full') && full_on_text.includes('on')) {
            checkbox = 'full_on';
        }
        if (!reason_input) {
            reason = branch;
        }

        // check if there's already something building
        robot.http(BUILDBOT_URL + "/json/builders/" + builder)
            .header('Cookie', [`_oauthproxy="${robot.brain.get('oauthproxy')}"`])
            .header('Accept', 'application/json')
            .get()(function(err, result, body) {
                if (DEBUG_LOGGING) {
                    console.log(`Made pre-build GET request. ${err}, ${result.statusCode}, ${result.getHeader}, ${body}`);
                }
                if (err) {
                    res.send(`Error occurred: ${err}. @topher`);
                    return;
                }
                if (result.statusCode === 403) {
                    res.send("Buildbot auth failed. @topher - fix me!");
                    return;
                }
                try {
                    preRequestBuilderStatus = JSON.parse(body);
                } catch(e) {
                    res.send(`Error occurred - unable to parse Buildbot's response. Check your request!`);
                }
                if ((preRequestBuilderStatus.currentBuilds.length > 0) ||
                    (preRequestBuilderStatus.pendingBuilds > 0)) {
                    res.send(`Build already in progress on ${builder}`);
                    return;
                }

                // nothing already building, make a request to build
                const payload = querystring.stringify({
                    username: res.envelope.user.name,
                    reason: reason,
                    branch,
                    forcescheduler: 'force',
                    revision: '',
                    checkbox: checkbox
                });
                robot.http(BUILDBOT_URL + "/builders/" + builder + "/force")
                    .header('Cookie', [`_oauthproxy="${robot.brain.get('oauthproxy')}"`])
                    .header('Content-Type', 'application/x-www-form-urlencoded')
                    .post(payload)(function(err, result, body) {
                        if (DEBUG_LOGGING) {
                            console.log(`Made build request. ${err}, ${result.statusCode}, ${result.getHeader}, ${body}`);
                        }
                        if (err) {
                            res.send(`Error occurred: ${err} @topher`);
                            return;
                        }
                        if (result.statusCode === 403) {
                            res.send("Buildbot auth failed 2. @topher - fix me!");
                            return;
                        }
                        if (result.statusCode !== 302) {
                            res.send(`Error occurred: ${result.statusCode} @topher`);
                            return;
                        }

                        // pause for a little sec so that buildbot can start the build (this api sucks)
                        sleep.msleep(100);

                        // get the build id of the newly started build
                        robot.http(BUILDBOT_URL + "/json/builders/" + builder)
                            .header('Cookie', [`_oauthproxy="${robot.brain.get('oauthproxy')}"`])
                            .header('Accept', 'application/json')
                            .get()(function(err, result, body) {
                                if (DEBUG_LOGGING) {
                                    console.log(`Made post-build GET request. ${err}, ${result.statusCode}, ${result.getHeader}, ${body}`);
                                }
                                if (err) {
                                    res.send(`Error occurred: ${err} @topher`);
                                    return;
                                }
                                if (result.statusCode === 403) {
                                    res.send("Buildbot auth failed 3. @topher - fix me!");
                                    return;
                                }
                                preRequestBuilderStatus = JSON.parse(body);
                                if (preRequestBuilderStatus.currentBuilds.length !== 1) {
                                    res.send("Build started, but unable to find build id. Monitoring disabled");
                                    return;
                                }

                                const buildId = preRequestBuilderStatus.currentBuilds[0];
                                if (checkbox) {
                                    res.send(`Building ${branch} on <${BUILDBOT_URL}/builders/${builder}/builds/${buildId}|${builder}> with full=on`);
                                } else {
                                    res.send(`Building ${branch} on <${BUILDBOT_URL}/builders/${builder}/builds/${buildId}|${builder}>`);
                                }
                                let builds = robot.brain.get('builds');
                                if (!builds) {
                                    builds = [];
                                }
                                builds.push({
                                    branch,
                                    builder,
                                    buildId,
                                    room: res.envelope.room,
                                    responded: false
                                });
                                robot.brain.set('builds', builds);
                            });
                    });
            });
    });

    robot.respond(/buildbot auth (.*)/i, function(res) {
        robot.brain.set('oauthproxy', res.match[1]);
        return res.send('Set new auth!');
    });

    notifier = new cronJob(
        CRON_TIME_EVERY_10_SECONDS,
        function() {
            const builds = robot.brain.get('builds');
            if (!builds) {
                return;
            }
            builds.forEach(function(build) {
                if (build.responded) {
                    return;
                }
                // figure out if the build is completed
                robot.http(BUILDBOT_URL + "/json/builders/" + build.builder + "/builds/" + build.buildId)
                    .header('Cookie', [`_oauthproxy="${robot.brain.get('oauthproxy')}"`])
                    .header('Accept', 'application/json')
                    .get()(function(err, result, body) {
                        if (DEBUG_LOGGING) {
                            console.log(`build GET request. ${err}, ${result.statusCode}, ${result.getHeader}, ${body}`);
                        }
                        if (err) {
                            console.log(`Error occurred: ${err}`);
                            return;
                        }
                        if (result.statusCode === 403) {
                            robot.messageRoom('topher', "Buildbot auth failed for monitor process");
                            return;
                        }
                        var status;
                        try {
                            status = JSON.parse(body);
                        } catch (e) {
                            robot.messageRoom(build.room, `${build.builder}:${build.buildId} monitoring failed. @topher`);
                            build.responded = true;
                            return;
                        }
                        if (!status.text || (status.text.length === 0)) {
                            // we're still running
                            return;
                        }
                        var statusText = '';
                        if Array.isArray(status.text) {
                            statusText = status.text.join(' ');
                        }
                        statusText = statusText.toLowerCase();
                        if (statusText.includes('failed')) {
                            robot.messageRoom(build.room, `Build ${build.branch} on <${BUILDBOT_URL}/builders/${build.builder}/builds/${build.buildId}|${build.builder}> failed`);
                            build.responded = true;
                        } else if (statusText.includes('successful')) {
                            robot.messageRoom(build.room, `Built ${build.branch} on <${BUILDBOT_URL}/builders/${build.builder}/builds/${build.buildId}>|${build.builder}!`);
                            build.responded = true;
                        } else {
                            robot.messageRoom(build.room, `${build.builder}:${build.buildId} unknown status "${status.text}". @topher`);
                            build.responded = true;
                        }
                    });
            });
        },
        null,
        true);
};

