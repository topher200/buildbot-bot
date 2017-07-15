Helper = require('hubot-test-helper')
chai = require 'chai'

expect = chai.expect

helper = new Helper('../scripts/buildbot.coffee')

OAUTHPROXY = process.env.HUBOT_OAUTHPROXY_VAL
unless OAUTHPROXY?
  console.log "no HUBOT_OAUTHPROXY_VAL in environment: testing may be broken"

describe 'buildbot integration', ->
  beforeEach ->
    @room = helper.createRoom()
    if not @room.robot.brain.get 'oauthproxy'
      console.log 'setting oauthproxy val from env, for testing'
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
        ['hubot', 'Building stable_db_migration on <demo-ppc-eight|https://buildbot.wordstream.com/builders/demo-ppc-eight/builds/185>']
      ]

    # this test relies on timing - the previous build should still be going
    it 'should respond with "already building" message', ->
      expect(@room.messages).to.eql [
        ['alice', 'hubot build stable_db_migration on demo-ppc-eight']
        ['hubot', 'Build already in progress on demo-ppc-eight']
      ]
