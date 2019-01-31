import {
  AlertController,
  ModalController,
  NavController,
  Platform
} from 'ionic-angular'
import { Component } from '@angular/core'
import { Http } from '@angular/http'
import { Storage } from '@ionic/storage'
import { LocalNotifications } from '@ionic-native/local-notifications'
import moment from 'moment'

@Component({
  selector: 'page-overview',
  templateUrl: 'view.html'
})
export class OverviewPage {

  stakers: Array<{
    name: string,
    url: string,
    stats: any,
    subscription: any,
    updated: any
  }>

  loaded: boolean

  hasNotifications: boolean

  paused: boolean

  showDetails: boolean

  pollRate: number

  pollRateMinutes: number

  onPauseSubscription: any

  onResumeSubscription: any

  inc: number

  constructor(
    public alertCtrl: AlertController,
    public http: Http,
    public modalCtrl: ModalController,
    public navCtrl: NavController,
    public platform: Platform,
    public storage: Storage,
    public localNotifications: LocalNotifications
  ) {
    // Set the default to an empty array
    this.stakers = []
    this.loaded = false
    this.showDetails = false
    this.pollRateMinutes = 1
    this.pollRate = 60000 * this.pollRateMinutes

    // Load the stakers
    this.loadStakersStorage()

    this.onPauseSubscription = this.platform.resume.subscribe(() => {
      // this.paused = true
    })

    this.onResumeSubscription = this.platform.resume.subscribe(() => {
      // this.paused = false
    })

    // We need to load the stakers stats
    setInterval(() => {
      this.doRefresh(false)
    }, this.pollRate)
  }

  ngOnDestroy() {
    // We don't need it anymore
    this.onPauseSubscription.unsubscribe()
    this.onResumeSubscription.unsubscribe()

    // Loop the stakers and remove subscriptions
    for (let staker of this.stakers) {
      // Check if we have a subscription
      if (typeof staker.subscription === 'function') {
        // Turn of the subscription
        staker.subscription.unsubscribe()
      }
    }
  }

  doRefresh(event) {
    this.loadStakersStats(event)
    this.updateNotifications()
  }

  deleteStaker(stakerId) {
    // make sure to clear notifications
    this.hasNotifications = false

    // Check if we have a subscription
    if (typeof this.stakers[stakerId].subscription === 'function') {
      // Turn of the subscription
      this.stakers[stakerId].subscription.unsubscribe()
    }

    // Remove the staker
    this.stakers.splice(stakerId, 1)

    // Save changes to storage
    this.saveStakersStorage()
  }

  addStaker(data) {
    // make sure to clear notifications
    this.hasNotifications = false

    // Add the staker
    this.stakers.push(data)

    // Save changes to storage
    this.saveStakersStorage()

    // Load the stats
    this.loadStakersStats()
  }

  saveStakersStorage() {
    // We are not loaded yet
    if (!this.loaded) {
      return
    }

    for (let staker of this.stakers) {
      // Check if we have a subscription
      if (typeof staker.subscription === 'function') {
        // Turn of the subscription
        staker.subscription.unsubscribe()
      }

      // Delete it from object
      delete staker.subscription
    }

    // Save changes to storage
    this.storage.set('stakers', JSON.stringify(this.stakers))
  }

  loadStakersStorage() {
    this.storage.get('stakers').then((val) => {
      if (val) {
        try {
          // Parse the stakers
          this.stakers = JSON.parse(val)

          // Load stats when we start up
          this.doRefresh(false)
        } catch (e) {
          /* handle error */
        }
      }

      // Tell everyone we are loaded
      this.loaded = true
    })
  }

  addStakerAlert() {
    this.alertCtrl.create({
      title: 'Add Staker',
      message: 'Enter the staker details',
      inputs: [
        {
          name: 'name',
          placeholder: 'Name'
        },
        {
          name: 'url',
          placeholder: 'URL'
        },
      ],
      buttons: [
        {
          text: 'Cancel',
          handler: data => {
            // Do nothing
          }
        },
        {
          text: 'Save',
          handler: data => {
            this.addStaker(data)
          }
        }
      ]
    }).present()
  }

  deleteStakerAlert(stakerId) {
    this.alertCtrl.create({
      title: 'Delete staker',
      message: 'Delete this staker permanently?',
      buttons: [
        {
          text: 'Cancel',
          handler: () => {
            // Do nothing
          }
        },
        {
          text: 'Delete',
          handler: () => {
            // Delete the staker
            this.deleteStaker(stakerId)
          }
        }
      ]
    }).present()
  }

  loadStakersStats(event) {
    // Create the observers
    if (this.stakers.length && !this.paused) {
      for (let staker of this.stakers) {
        staker.subscription = this.http
          .get(`${staker.url}/report.json`)
          .subscribe(response => {
            try {
              staker.updated = moment().toDate()
              staker.stats = response.json()
              staker.stats.last30d = parseFloat(staker.stats.report['Last 30 Days'])
              staker.stats.last30dAvg = parseFloat(staker.stats.report['Last 30 Days']) / 30
              staker.stats.last365d = parseFloat(staker.stats.report['Last 365 Days'])
              staker.stats.last365dAvg = parseFloat(staker.stats.report['Last 365 Days']) / 365
              staker.stats.last7d = parseFloat(staker.stats.report['Last 7 Days'])
              staker.stats.last7dAvg = parseFloat(staker.stats.report['Last 7 Days']) / 7
              staker.stats.alltime = parseFloat(staker.stats.report['Last All'])
              staker.stats.eta = moment().add('seconds', staker.stats.info.expectedtime).toDate()
              staker.stats.laststake = moment.utc(staker.stats.report['Latest Time']).toDate()

              this.saveStakersStorage()
            } catch (e) {
              /* handle error */
            }

            // Check if we have an event
            if (event) {
              // Close the refresh
              event.complete()
            }
          })
      }
    }
  }

  updateNotifications() {
    // Check if we already have and just need to update
    if (!this.hasNotifications) {
        // Clear old notifications
        this.localNotifications.clearAll()
    }

    // Loop the stakers
    for (let i = 0, len = this.stakers.length; i < len; i++) {
      // Get the staker
      let staker = this.stakers[i]

      // Check if we have a staker
      if (!staker.stats) {
        continue
      }

      // Build the notification
      let notification = {
        id: i,
        title: staker.name,
        launch: true,
        wakeup: false,
        text: 'Balance: ' + (staker.stats.balance + staker.stats.unconfirmedbalance).toFixed(2) + ' | Eta: ' + moment(staker.stats.eta).fromNow() + ' | Last: ' + moment(staker.stats.laststake).fromNow(),
        sticky: true
      }

      // Check if we already have and just need to update
      if (this.hasNotifications) {
        // Update a single notification
        this.localNotifications.update(notification)
      } else {
        // Schedule a single notification
        this.localNotifications.schedule(notification)
      }
    }

    // We are done
    this.hasNotifications = true
  }
}
