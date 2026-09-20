package com.izdrail.greader;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;

import androidx.appcompat.app.AppCompatDelegate;
import androidx.core.os.LocaleListCompat;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.izdrail.greader.widget.UnreadWidgetProvider;

/**
 * Bridge between the web app and native-only surfaces: the home-screen widget
 * (unread count) and the per-app locale preference.
 *
 * UNVERIFIED: this plugin has not been compiled or run - there is no Android
 * toolchain in the build environment. It is a faithful stub pending a real
 * `gradlew assembleDebug` pass and on-device verification.
 */
@CapacitorPlugin(name = "NativeBridge")
public class NativeBridgePlugin extends Plugin {
  public static final String PREFS = "greader_native_bridge";
  public static final String KEY_UNREAD = "unread_count";
  public static final String KEY_LOCALE = "app_locale";

  @PluginMethod
  public void setUnreadCount(PluginCall call) {
    int count = Math.max(0, call.getInt("count", 0));
    Context context = getContext();
    prefs(context).edit().putInt(KEY_UNREAD, count).apply();
    AppWidgetManager manager = AppWidgetManager.getInstance(context);
    int[] ids = manager.getAppWidgetIds(new ComponentName(context, UnreadWidgetProvider.class));
    UnreadWidgetProvider.updateAll(context, manager, ids);
    call.resolve();
  }

  @PluginMethod
  public void setAppLocale(PluginCall call) {
    String locale = call.getString("locale", "system");
    prefs(getContext()).edit().putString(KEY_LOCALE, locale).apply();
    applyLocale(locale);
    call.resolve();
  }

  static SharedPreferences prefs(Context context) {
    return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
  }

  /** Called from MainActivity.onCreate so a stored locale survives process death. */
  static void applyStoredLocale(Context context) {
    applyLocale(prefs(context).getString(KEY_LOCALE, "system"));
  }

  private static void applyLocale(String locale) {
    if (locale == null || locale.equals("system")) {
      AppCompatDelegate.setApplicationLocales(LocaleListCompat.getEmptyLocaleList());
    } else {
      AppCompatDelegate.setApplicationLocales(LocaleListCompat.forLanguageTags(locale));
    }
  }
}
