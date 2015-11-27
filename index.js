import request from 'request'

const jobDataProperties = ['name', 'tags', 'public', 'build', 'custom-data']

class SauceService {
    /**
     * gather information about runner
     */
    before (capabilities) {
        this.sessionId = global.browser.sessionId
        this.capabilities = capabilities
        this.sauceUser = global.browser.requestHandler.auth.user
        this.sauceKey = global.browser.requestHandler.auth.pass
        this.sauceAPIUri = `https://saucelabs.com/rest/v1/${this.sauceUser}/jobs/${this.sessionId}`
    }

    /**
     * update Sauce Labs job
     */
    after (failures) {
        if (!this.sauceUser || !this.sauceKey) {
            return
        }

        return new Promise((resolve, reject) => request.put(this.sauceAPIUri, {
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

let service = new SauceService()
export default service
