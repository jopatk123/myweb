/**
 * 在当前标签页跳转到指定地址（不会新开标签页）。
 * @param {string} url 目标地址
 * @param {Location} [locationRef] 页面 Location 对象，测试时可注入替身
 */
export function navigateInPlace(url, locationRef = window.location) {
  locationRef.assign(url);
}
