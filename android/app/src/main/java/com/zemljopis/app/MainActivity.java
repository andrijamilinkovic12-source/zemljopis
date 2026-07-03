package com.zemljopis.app;

import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Bundle;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final int ZEMLJOPIS_BACKGROUND = Color.rgb(2, 8, 3);

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DeviceIdentityPlugin.class);
        getWindow().setBackgroundDrawable(new ColorDrawable(ZEMLJOPIS_BACKGROUND));
        super.onCreate(savedInstanceState);

        WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.setBackgroundColor(ZEMLJOPIS_BACKGROUND);
        }
    }
}
