# Description:
#   Provides an interface to Buildbot v0.8.10
#
# TODO
# Dependencies:
#   "<module name>": "<module version>"
#
# Configuration:
#   LIST_OF_ENV_VARS_TO_SET
#
# Commands:
#   hubot <trigger> - <what the respond trigger does>
#   <trigger> - <what the hear trigger does>
#
# Notes:
#   <optional notes required for the script>
#
# Author:
#   t.brown@wordstream.com

querystring = require 'querystring'

BUILDBOT_URL = process.env.HUBOT_BUILDBOT_URL_NO_TRAILING_SLASH
unless BUILDBOT_URL?
  console.log "no HUBOT_BUILDBOT_URL_NO_TRAILING_SLASH in environment: please set and try again"
  process.exit(1)

module.exports = (robot) ->

  robot.respond /build (.*) on (.*)/i, (res) ->
    # parse request
    branch = res.match[1]
    builder = res.match[2]

    # check if there's already something building
    robot.http(BUILDBOT_URL + "/json/builders/" + builder)
      .header('Cookie', ['_oauthproxy="' + robot.brain.get('oauthproxy') + '"'])
      .header('Accept', 'application/json')
      .get() (err, result, body) ->
        console.log "Made pre-build GET request. #{err}, #{result.statusCode}, #{result.getHeader}, #{body}"
        if err
          res.send "Error occurred: #{err}"
          return
        if result.statusCode == 403
          res.send "Buildbot auth failed. @topher - fix me!"
          return
        preRequestBuilderStatus = JSON.parse body
        if (preRequestBuilderStatus.currentBuilds.length > 0 or
            preRequestBuilderStatus.pendingBuilds > 0)
          res.send "Unknown build already in progress on #{builder}"
          return

        # nothing already building, make a request to build
        payload = querystring.stringify({
          username: '@topher'
          reason: 'toph test'
          branch: branch
          forcescheduler: 'force'
          revision: ''
        });
        robot.http(BUILDBOT_URL + "/builders/" + builder + "/force")
          .header('Cookie', ['_oauthproxy="' + robot.brain.get('oauthproxy') + '"'])
          .header('Content-Type', 'application/x-www-form-urlencoded')
          .post(payload) (err, result, body) ->
            console.log "Made build request. #{err}, #{result.statusCode}, #{result.getHeader}, #{body}"
            if err
              res.send "Error occurred: #{err}"
              return
            if result.statusCode == 403
              res.send "Buildbot auth failed 2"
              return
            if result.statusCode != 302
              res.send "Error occurred: #{result.statusCode}"
              return

            res.send "Building #{branch} on #{builder}"

  robot.respond /buildbot auth (.*)/i, (res) ->
    robot.brain.set 'oauthproxy', res.match[1]
    res.send 'Set new auth!'
