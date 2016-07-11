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

        global.browser.execute('sauce:context=' + test.parent + ' - ' + test.title)
    }

    beforeFeature (feature) {
        if (!this.sauceUser || !this.sauceKey) {
            return
        }

        this.suiteTitle = feature.getName()
        global.browser.execute('sauce:context=Feature: ' + this.suiteTitle)
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
    after (failures) {
        if (!this.sauceUser || !this.sauceKey) {
            return
        }

        return this.updateJob(this.sessionId, failures)
    }

    onReload (oldSessionId, newSessionId) {
        if (!this.sauceUser || !this.sauceKey) {
            return
        }

        this.sessionId = newSessionId
        return this.updateJob(oldSessionId)
    }

    updateJob (sessionId, failures) {
        return new Promise((resolve, reject) => request.put(this.getSauceRestUrl(sessionId), {
            json: true,
            auth: {
                user: this.sauceUser,
                pass: this.sauceKey
            },
            body: this.getBody(failures)
        }, (e, res, body) => {
            if (e) {
                return reject(e)
            }
            global.browser.jobData = body
            resolve(body)
        }))
    }

    /**
     * massage data
     */
    getBody (failures) {
        let body = {}

        /**
         * set default values
         */
        body.name = this.suiteTitle

        if (typeof failures !== 'number') {
            body.name += ` (${++this.testCnt})`
            failures = 0
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
