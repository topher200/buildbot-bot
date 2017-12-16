const Helper = require('hubot-test-helper');
const chai = require('chai');

const { expect } = chai;

const helper = new Helper('../scripts/buildbot.js');

const HTTP_AUTH = process.env.HUBOT_HTTP_AUTH;
if (!HTTP_AUTH) {
    console.log("no HUBOT_HTTP_AUTH in environment: testing may be broken");
}

describe('buildbot integration', function() {
    beforeEach(function() {
        this.room = helper.createRoom();
        if (!this.room.robot.brain.get('http_auth')) {
            console.log('setting http_auth val from env, for testing');
            this.room.robot.brain.set('http_auth', HTTP_AUTH);
        }
    });

    afterEach(function() {
        this.room.destroy();
    });

    return context('build branch on builder', function() {
        beforeEach(function(done) {
            this.room.user.say('alice', 'hubot build stable_db_migration on demo-ppc-four');
            setTimeout(done, 1000);
        });

        it('should respond with build message', function() {
            expect(this.room.messages).to.eql([
                ['alice', 'hubot build stable_db_migration on demo-ppc-four'],
                ['hubot', 'Building stable_db_migration on <https://buildbot.wordstream.com/builders/demo-ppc-four/builds/185|demo-ppc-four>']
            ]);
        });

        // this test relies on timing - the previous build should still be going
        it('should respond with "already building" message', function() {
            expect(this.room.messages).to.eql([
                ['alice', 'hubot build stable_db_migration on demo-ppc-four'],
                ['hubot', 'Build already in progress on demo-ppc-four']
            ]);
        });
    });
});
