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

        console.log('run sauce connext')

        return new Promise((resolve, reject) => SauceConnectLauncher({
            username: config.user,
            accessKey: config.key
        }, (err, sauceConnectProcess) => {
            if (err) {
                return reject(err)
            }
            console.log('sauce connext satrted')

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
