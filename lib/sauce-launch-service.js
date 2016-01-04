import SauceConnectLauncher from 'sauce-connect-launcher'

class SauceLaunchService {
    /**
     * modify config and launch sauce connect
     */
    onPrepare (config) {
        if (!config.sauceConnect) {
            return
        }

        config.host = 'localhost'
        config.port = 4445

        this.sauceConnectOpts = Object.assign({
            username: config.user,
            accessKey: config.key
        }, config.sauceConnectOpts)

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
