import { BrowserModule } from '@angular/platform-browser'
import { HttpModule } from '@angular/http'
import { IonicApp, IonicModule, IonicErrorHandler } from 'ionic-angular'
import { IonicStorageModule } from '@ionic/storage'
import { MomentModule } from 'angular2-moment'
import { NgModule, ErrorHandler } from '@angular/core'

import { NStake } from './app.component'

import { OverviewPage } from '../pages/overview/controller'

import { StatusBar } from '@ionic-native/status-bar'
import { SplashScreen } from '@ionic-native/splash-screen'
import { LocalNotifications } from '@ionic-native/local-notifications'
import { BackgroundMode } from '@ionic-native/background-mode'

@NgModule({
  declarations: [
    NStake,
    OverviewPage,
  ],
  imports: [
    BrowserModule,
    HttpModule,
    IonicModule.forRoot(NStake),
    IonicStorageModule.forRoot(),
    MomentModule,
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    NStake,
    OverviewPage,
  ],
  providers: [
    StatusBar,
    SplashScreen,
    LocalNotifications,
    BackgroundMode,
    {provide: ErrorHandler, useClass: IonicErrorHandler}
  ]
})

export class AppModule {}
