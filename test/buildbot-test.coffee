Helper = require('hubot-test-helper')
chai = require 'chai'

expect = chai.expect

helper = new Helper('../scripts/buildbot.coffee')

describe 'buildbot integration', ->
  beforeEach ->
    @room = helper.createRoom()

  afterEach ->
    @room.destroy()

  it 'build branch on builder', ->
    @room.user.say('alice', 'wordy build PPC-123 on demo-ppc-eight').then =>
      expect(@room.messages).to.eql [
        ['alice', 'build PPC-123 on demo-ppc-eight']
        ['hubot', 'building']
      ]
