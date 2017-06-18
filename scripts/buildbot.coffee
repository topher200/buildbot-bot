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

module.exports = (robot) ->

  robot.respond /build (.*) on (.*)/i, (res) ->
    branch = res.match[1]
    builder = res.match[2]

    res.reply "building"
