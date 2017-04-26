import SauceConnectLauncher from 'sauce-connect-launcher'

class SauceLaunchService {
    /**
     * modify config and launch sauce connect
     */
    onPrepare (config, capabilities) {
        if (!config.sauceConnect) {
            return
        }

        this.sauceConnectOpts = Object.assign({
            username: config.user,
            accessKey: config.key
        }, config.sauceConnectOpts)

        config.protocol = 'http'
        config.host = 'localhost'
        config.port = this.sauceConnectOpts.port || 4445

        const sauceConnectTunnelIdentifier = this.sauceConnectOpts.tunnelIdentifier

        if (sauceConnectTunnelIdentifier) {
            capabilities.forEach((capability) => {
                capability.tunnelIdentifier = sauceConnectTunnelIdentifier
            })
        }

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
