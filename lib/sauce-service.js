import request from 'request'

const jobDataProperties = ['name', 'tags', 'public', 'build', 'custom-data']

const jasmineTopLevelSuite = 'Jasmine__TopLevel__Suite'

const REGION_MAPPING = {
    'eu': 'eu-central-1'
}

function getSauceEndpoint (region) {
    const dc = region ? (REGION_MAPPING[region] || region) + '.' : ''
    return `${dc}saucelabs.com`
}

class SauceService {
    /**
     * gather information about runner
     */
    before (capabilities) {
        this.sessionId = global.browser.sessionId
        this.capabilities = capabilities
        this.auth = global.browser.requestHandler.auth || {}
        this.sauceUser = this.auth.user
        this.sauceKey = this.auth.pass
        this.testCnt = 0
        this.failures = 0 // counts failures between reloads
    }

    beforeSession (config) {
        this.hostname = getSauceEndpoint(config.region)
    }

    getSauceRestUrl (sessionId) {
        return `https://${this.hostname}/rest/v1/${this.sauceUser}/jobs/${sessionId}`
    }

    beforeSuite (suite) {
        this.suiteTitle = suite.title
    }

    beforeTest (test) {
        if (!this.sauceUser || !this.sauceKey) {
            return
        }

        /**
         * in jasmine we get Jasmine__TopLevel__Suite as title since service using test
         * framework hooks in order to execute async functions.
         * This tweak allows us to set the real suite name for jasmine jobs.
         */
        if (this.suiteTitle === jasmineTopLevelSuite) {
            this.suiteTitle = test.fullName.slice(0, test.fullName.indexOf(test.title) - 1)
        }

        const context = test.parent === jasmineTopLevelSuite ? test.fullName : test.parent + ' - ' + test.title

        global.browser.execute('sauce:context=' + context)
    }

    afterSuite (suite) {
        if (suite.hasOwnProperty('err')) {
            ++this.failures
        }
    }

    afterTest (test) {
        if (!test.passed) {
            ++this.failures
        }
    }

    beforeFeature (feature) {
        if (!this.sauceUser || !this.sauceKey) {
            return
        }

        this.suiteTitle = feature.name || feature.getName()
        global.browser.execute('sauce:context=Feature: ' + this.suiteTitle)
    }

    afterStep (feature) {
        if (
            /**
             * Cucumber v1
             */
            feature.failureException ||
            /**
             * Cucumber v2
             */
            (typeof feature.getFailureException === 'function' && feature.getFailureException()) ||
            /**
             * Cucumber v3, v4
             */
            (feature.status === 'failed')
        ) {
            ++this.failures
        }
    }

    beforeScenario (scenario) {
        if (!this.sauceUser || !this.sauceKey) {
            return
        }

        const scenarioName = scenario.name || scenario.getName()
        global.browser.execute('sauce:context=Scenario: ' + scenarioName)
    }

    /**
     * update Sauce Labs job
     */
    after (result) {
        if (!this.sauceUser || !this.sauceKey) {
            return
        }
        let failures = this.failures

        /**
         * set failures if user has bail option set in which case afterTest and
         * afterSuite aren't executed before after hook
         */
        if (global.browser.config.mochaOpts && global.browser.config.mochaOpts.bail && Boolean(result)) {
            failures = 1
        }

        // const status = 'status: ' + (failures > 0 ? 'failing' : 'passing')
        if (!global.browser.isMultiremote) {
            // log.info(`Update job with sessionId ${global.browser.sessionId}, ${status}`)
            return this.updateJob(global.browser.sessionId, failures)
        }

        return Promise.all(Object.keys(this.capabilities).map((browserName) => {
            // log.info(`Update multiremote job for browser "${browserName}" and sessionId ${global.browser[browserName].sessionId}, ${status}`)
            return this.updateJob(global.browser[browserName].sessionId, failures, false, browserName)
        }))
    }

    onReload (oldSessionId, newSessionId) {
        if (!this.sauceUser || !this.sauceKey) {
            return
        }

        this.sessionId = newSessionId
        return this.updateJob(oldSessionId, this.failures, true)
    }

    updateJob (sessionId, failures, calledOnReload = false) {
        return new Promise((resolve, reject) => request.put(this.getSauceRestUrl(sessionId), {
            json: true,
            auth: {
                user: this.sauceUser,
                pass: this.sauceKey
            },
            body: this.getBody(failures, calledOnReload)
        }, (e, res, body) => {
            if (e) {
                return reject(e)
            }
            global.browser.jobData = body
            this.failures = 0
            resolve(body)
        }))
    }

    /**
     * massage data
     */
    getBody (failures, calledOnReload = false) {
        let body = {}

        /**
         * set default values
         */
        body.name = this.suiteTitle

        /**
         * add reload count to title if reload is used
         */
        if (calledOnReload || this.testCnt) {
            body.name += ` (${++this.testCnt})`
        }

        for (let prop of jobDataProperties) {
            if (!this.capabilities[prop]) {
                continue
            }

            body[prop] = this.capabilities[prop]
        }

        body.passed = failures === 0
        return body
    }
}

export default SauceService
