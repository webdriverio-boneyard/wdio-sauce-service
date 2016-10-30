import SauceConnectLauncher from 'sauce-connect-launcher'

class SauceLaunchService {
    /**
     * modify config and launch sauce connect
     */
    onPrepare (config) {
        if (!config.sauceConnect) {
            return
        }

        this.sauceConnectOpts = Object.assign({
            username: config.user,
            accessKey: config.key
        }, config.sauceConnectOpts)

        config.host = 'localhost'
        config.port = this.sauceConnectOpts.port || 4445

        return new Promise((resolve, reject) => SauceConnectLauncher(this.sauceConnectOpts, (err, sauceConnectProcess) => {
            if (err) {
                return reject(err)
            }

            this.sauceConnectProcess = sauceConnectProcess
            resolve()
        }))
    }

    /**
     * shut down sauce connect
     */
    onComplete () {
        if (!this.sauceConnectProcess) {
            return
        }

        return new Promise((r) => this.sauceConnectProcess.close(r))
    }
}

export default SauceLaunchService
