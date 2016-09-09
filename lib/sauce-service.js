import request from 'request'

const jobDataProperties = ['name', 'tags', 'public', 'build', 'custom-data']

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

    getSauceRestUrl (sessionId) {
        return `https://saucelabs.com/rest/v1/${this.sauceUser}/jobs/${sessionId}`
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
        if (this.suiteTitle === 'Jasmine__TopLevel__Suite') {
            this.suiteTitle = test.fullName.slice(0, test.fullName.indexOf(test.name) - 1)
        }

        global.browser.execute('sauce:context=' + test.parent + ' - ' + test.title)
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

        this.suiteTitle = feature.getName()
        global.browser.execute('sauce:context=Feature: ' + this.suiteTitle)
    }

    afterStep (feature) {
        if (feature.getFailureException()) {
            ++this.failures
        }
    }

    beforeScenario (scenario) {
        if (!this.sauceUser || !this.sauceKey) {
            return
        }

        global.browser.execute('sauce:context=Scenario: ' + scenario.getName())
    }

    /**
     * update Sauce Labs job
     */
    after () {
        if (!this.sauceUser || !this.sauceKey) {
            return
        }

        return this.updateJob(this.sessionId, this.failures)
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
