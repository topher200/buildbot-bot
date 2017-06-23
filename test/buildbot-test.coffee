Helper = require('hubot-test-helper')
chai = require 'chai'

expect = chai.expect

helper = new Helper('../scripts/buildbot.coffee')

OAUTHPROXY = process.env.HUBOT_OAUTHPROXY_VAL
unless OAUTHPROXY?
  console.log "no HUBOT_OAUTHPROXY_VAL in environment: please set and try again"
  process.exit(1)

describe 'buildbot integration', ->
  beforeEach ->
    @room = helper.createRoom()
    @room.robot.brain.set 'oauthproxy', OAUTHPROXY

  afterEach ->
    @room.destroy()

  context 'build branch on builder', ->
    beforeEach (done) ->
      @room.user.say 'alice', 'hubot build stable_db_migration on demo-ppc-eight'
      setTimeout done, 1000

    it 'should respond with build message', ->
      expect(@room.messages).to.eql [
        ['alice', 'hubot build stable_db_migration on demo-ppc-eight']
        ['hubot', 'Building stable_db_migration on demo-ppc-eight']
      ]

    # this test relies on timing - the previous build should still be going
    it 'should respond with "already building" message', ->
      expect(@room.messages).to.eql [
        ['alice', 'hubot build stable_db_migration on demo-ppc-eight']
        ['hubot', 'Unknown build already in progress on demo-ppc-eight']
      ]
