import { AdMob, BannerAdSize, BannerAdPosition } from "@capacitor-community/admob";

// Google's official TEST ad unit IDs — safe to use during development.
// Replace with your real AdMob unit IDs before publishing, or you risk
// your AdMob account being flagged for invalid traffic.
const BANNER_AD_ID = "ca-app-pub-3940256099942544/6300978111";
const REWARDED_AD_ID = "ca-app-pub-3940256099942544/5224354917";

let initialized = false;

export async function initAdMob() {
  if (initialized) return;
  try {
    await AdMob.initialize({ requestTrackingAuthorization: true });
    initialized = true;
  } catch (e) {
    console.warn("AdMob init skipped (expected in browser preview):", e.message);
  }
}

export async function showBannerAd() {
  try {
    await initAdMob();
    await AdMob.showBanner({
      adId: BANNER_AD_ID,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      isTesting: true, // remove this line once using real ad unit IDs
    });
  } catch (e) {
    console.warn("Banner ad skipped:", e.message);
  }
}

// Shows a rewarded video ad and resolves true only if the user watched it
// through to completion and earned the reward.
export async function watchRewardedAd() {
  try {
    await initAdMob();
    await AdMob.prepareRewardVideoAd({ adId: REWARDED_AD_ID, isTesting: true });
    const result = await AdMob.showRewardVideoAd();
    return !!result;
  } catch (e) {
    console.warn("Rewarded ad failed or unavailable:", e.message);
    return false;
  }
}
  
