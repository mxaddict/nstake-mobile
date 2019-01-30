import {
  AlertController,
  ModalController,
  NavController,
  Platform
} from 'ionic-angular'
import { Component } from '@angular/core'
import { Http } from '@angular/http'
import { Storage } from '@ionic/storage'

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
    updated: Date
  }>

  loaded: boolean

  paused: boolean

  showDetails: boolean

  pollRate: number

  pollRateMinutes: number

  onPauseSubscription: any

  onResumeSubscription: any

  constructor(
    public alertCtrl: AlertController,
    public http: Http,
    public modalCtrl: ModalController,
    public navCtrl: NavController,
    public platform: Platform,
    public storage: Storage
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
      console.log('paused')
      this.paused = true
    })

    this.onResumeSubscription = this.platform.resume.subscribe(() => {
      console.log('resumed')
      this.paused = false
    })

    // We need to load the stakers stats
    setInterval(() => {
      this.loadStakersStats()
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

  deleteStaker(stakerId) {
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
          this.loadStakersStats()
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

  loadStakersStats() {
    // Create the observers
    if (this.stakers.length && !this.paused) {
      for (let staker of this.stakers) {
        staker.subscription = this.http
          .get(`${staker.url}/report.json`)
          .subscribe(response => {
            try {
              staker.stats = response.json()
              staker.stats.spreadPercent = staker.stats.spread / staker.stats.bid
              staker.stats.balance[staker.stats.asset].profit = staker.stats.balance[staker.stats.asset].consolidated - staker.stats.balance[staker.stats.asset].total
              staker.stats.balance[staker.stats.currency].profit = staker.stats.balance[staker.stats.currency].consolidated - staker.stats.balance[staker.stats.currency].total
              staker.updated = new Date

              this.saveStakersStorage()
            } catch (e) {
              /* handle error */
            }
          })
      }
    }
  }

}
