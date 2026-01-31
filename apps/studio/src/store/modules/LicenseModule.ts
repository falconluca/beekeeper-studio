import _ from 'lodash'
import { install, Module } from "vuex";
import rawLog from '@bksLogger'
import { State as RootState } from '../index'
import { CloudError } from '@/lib/cloud/ClientHelpers';
import { TransportLicenseKey } from '@/common/transport';
import Vue from "vue"
import { LicenseStatus } from '@/lib/license';
import { SmartLocalStorage } from '@/common/LocalStorage';
import globals from '@/common/globals';
import { CloudClient } from '@/lib/cloud/CloudClient';

interface State {
  initialized: boolean
  licenses: TransportLicenseKey[]
  error: CloudError | Error | null
  now: Date
  status: LicenseStatus,
  installationId: string | null
}

const log = rawLog.scope('LicenseModule')

const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds

// Create a dummy license for development mode
const yearsInFuture = (years: number) => {
  const date = new Date()
  date.setFullYear(date.getFullYear() + years)
  return date
}

const devLicense: TransportLicenseKey = {
  id: 999,
  createdAt: new Date(),
  updatedAt: new Date(),
  version: 1,
  email: 'dev@beekeeper.local',
  key: 'dev-license-key',
  validUntil: yearsInFuture(100),
  supportUntil: yearsInFuture(100),
  licenseType: 'BusinessLicense',
  active: true,
  maxAllowedAppRelease: null
}

const defaultStatus = new LicenseStatus()
Object.assign(defaultStatus, {
  edition: "community",
  condition: "initial",
})

export const LicenseModule: Module<State, RootState>  = {
  namespaced: true,
  state: () => ({
    initialized: false,
    licenses: [],
    error: null,
    now: new Date(),
    status: defaultStatus,
    installationId: null
  }),
  getters: {
    trialLicense(state) {
      return devLicense
    },
    realLicenses(state) {
      return [devLicense]
    },
    licenseDaysLeft(state) {
      // 100 years
      return 36500
    },
    noLicensesFound(state) {
      return state.licenses.length === 0
    },
    isUltimate(state) {
      return true
    },
    isCommunity(state) {
      return false
    },
    isTrial(state) {
      return false
    },
    isValidStateExpired(state) {
      // this means a license with lifetime perms, but is no longer valid for software updates
      // so the user has to use an older version of the app.
      return false
    }
  },
  mutations: {
    set(state, licenses: TransportLicenseKey[]) {
      state.licenses = licenses
    },
    setInitialized(state, b: boolean) {
      state.initialized = b
    },
    installationId(state, id: string) {
      state.installationId = id
    },
    setNow(state, date: Date) {
      state.now = date
    },
    setStatus(state, status: LicenseStatus) {
      state.status = status
    },
  },
  actions: {
    async init(context) {
      if (context.state.initialized) {
        log.warn('Already initialized')
        return
      }
      await context.dispatch('sync')
      const installationId = await Vue.prototype.$util.send('license/getInstallationId');
      context.commit('installationId', installationId)


      if (!window.platformInfo.isDevelopment) {
        // refreshing in dev mode resets the dev credentials added by the menu
        setInterval(() => context.dispatch('sync'), globals.licenseCheckInterval)
      } else {
        log.warn("Credential refreshing is disabled (dev mode detected)")
      }
      context.commit('setInitialized', true)
    },
    async add(context, { email, key, trial }) {
      if (trial) {
        await Vue.prototype.$util.send('license/createTrialLicense')
        await Vue.prototype.$noty.info("Your 14 day free trial has started, enjoy!")
      } else {
        // Get the installation ID from the backend
        const installationId = context.state.installationId

        const result = await CloudClient.getLicense(
          window.platformInfo.cloudUrl,
          email,
          key,
          installationId,
          window.platformInfo
        );

        // if we got here, license is good.
        const license = {} as TransportLicenseKey;
        license.key = key;
        license.email = email;
        license.validUntil = new Date(result.validUntil);
        license.supportUntil = new Date(result.supportUntil);
        license.maxAllowedAppRelease = result.maxAllowedAppRelease;
        license.licenseType = result.licenseType;
        await Vue.prototype.$util.send('appdb/license/save', { obj: license });
      }
      // allow emitting expired license events next time
      SmartLocalStorage.setBool('expiredLicenseEventsEmitted', false)
      await context.dispatch('sync')
    },
    async update(_context, license: TransportLicenseKey) {
      // This is to allow for dev switching
      const isDevUpdate = window.platformInfo.isDevelopment && license.email == "fake_email";
      try {
        // Get the installation ID
        const installationId = _context.state.installationId

        const data = isDevUpdate ? license : await CloudClient.getLicense(
          window.platformInfo.cloudUrl,
          license.email,
          license.key,
          installationId,
          window.platformInfo
        );

        license.validUntil = new Date(data.validUntil)
        license.supportUntil = new Date(data.supportUntil)
        license.maxAllowedAppRelease = data.maxAllowedAppRelease
        await Vue.prototype.$util.send('appdb/license/save', { obj: license });
      } catch (error) {
        if (error instanceof CloudError) {
          // eg 403, 404, license not valid
          license.validUntil = new Date()
          await Vue.prototype.$util.send('appdb/license/save', { obj: license });
        } else {
          log.error("Problems getting license", error)
          // eg 500 errors
          // do nothing
        }
      }
    },
    async updateAll(context) {
      for (let index = 0; index < context.getters.realLicenses.length; index++) {
        const license = context.getters.realLicenses[index];
        await context.dispatch('update', license);
      }
      await context.dispatch('sync');
    },
    async remove(context, license) {
      await Vue.prototype.$util.send('license/remove', { id: license.id })
      await context.dispatch('sync')
    },
    async sync(context) {
      const status = await Vue.prototype.$util.send('license/getStatus')
      const licenses = await Vue.prototype.$util.send('license/get')
      context.commit('set', licenses)
      context.commit('setStatus', status)
      context.commit('setNow', new Date())
    },
  }
}
