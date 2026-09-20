package com.izdrail.greader.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

import com.izdrail.greader.MainActivity;
import com.izdrail.greader.NativeBridgePlugin;
import com.izdrail.greader.R;

/**
 * Home-screen widget showing the unread article count; tapping it opens the app.
 * Resizable, which covers the original APK's small/medium/large variants with
 * one provider.
 *
 * UNVERIFIED: not yet compiled or run - no Android toolchain in the build
 * environment. Pending `gradlew assembleDebug` and on-device verification.
 */
public class UnreadWidgetProvider extends AppWidgetProvider {
  @Override
  public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
    updateAll(context, appWidgetManager, appWidgetIds);
  }

  public static void updateAll(Context context, AppWidgetManager manager, int[] ids) {
    int unread = context
        .getSharedPreferences(NativeBridgePlugin.PREFS, Context.MODE_PRIVATE)
        .getInt(NativeBridgePlugin.KEY_UNREAD, 0);
    for (int id : ids) {
      RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_unread);
      views.setTextViewText(R.id.widget_count, String.valueOf(unread));
      views.setTextViewText(R.id.widget_label, context.getString(R.string.widget_unread_label));
      Intent intent = new Intent(context, MainActivity.class);
      PendingIntent pending = PendingIntent.getActivity(
          context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
      views.setOnClickPendingIntent(R.id.widget_container, pending);
      manager.updateAppWidget(id, views);
    }
  }
}
