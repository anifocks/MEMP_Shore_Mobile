package com.viswa.memp;

import android.os.Bundle;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import androidx.cardview.widget.CardView;
import com.google.android.material.appbar.MaterialToolbar;

public class MEMPOverviewActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_overview);

        MaterialToolbar toolbar = findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);
        getSupportActionBar().setTitle("MEMP Overview");
        getSupportActionBar().setDisplayHomeAsUpEnabled(true);

        setupStatisticsCards();
        setupRecentActivity();
    }

    private void setupStatisticsCards() {
        LinearLayout statsContainer = findViewById(R.id.statsContainer);

        String[] stats = {"25", "12", "156", "94.2%"};
        String[] labels = {"Total Vessels", "Active Voyages", "Total Reports", "Compliance Rate"};

        for (int i = 0; i < stats.length; i++) {
            CardView card = createStatCard(stats[i], labels[i]);
            statsContainer.addView(card);
        }
    }

    private CardView createStatCard(String value, String label) {
        CardView cardView = new CardView(this);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1);
        params.setMargins(8, 8, 8, 8);
        cardView.setLayoutParams(params);
        cardView.setCardElevation(4);
        cardView.setRadius(8);
        cardView.setCardBackgroundColor(getResources().getColor(R.color.white));
        cardView.setPadding(16, 16, 16, 16);

        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setGravity(android.view.Gravity.CENTER);

        TextView valueText = new TextView(this);
        valueText.setText(value);
        valueText.setTextSize(28);
        valueText.setTextColor(getResources().getColor(R.color.primary));
        valueText.setTypeface(null, android.graphics.Typeface.BOLD);

        TextView labelText = new TextView(this);
        labelText.setText(label);
        labelText.setTextSize(14);
        labelText.setTextColor(getResources().getColor(R.color.gray));
        labelText.setGravity(android.view.Gravity.CENTER);

        layout.addView(valueText);
        layout.addView(labelText);
        cardView.addView(layout);

        return cardView;
    }

    private void setupRecentActivity() {
        LinearLayout activityContainer = findViewById(R.id.activityContainer);

        String[] activities = {
            "Report Submitted - MV Ocean Pride - 2 hours ago",
            "Voyage Completed - MV Sea Explorer - 5 hours ago",
            "Compliance Alert - MV Blue Wave - 1 day ago"
        };

        for (String activity : activities) {
            CardView card = createActivityCard(activity);
            activityContainer.addView(card);
        }
    }

    private CardView createActivityCard(String activity) {
        CardView cardView = new CardView(this);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        params.setMargins(0, 4, 0, 4);
        cardView.setLayoutParams(params);
        cardView.setCardElevation(2);
        cardView.setRadius(6);
        cardView.setCardBackgroundColor(getResources().getColor(R.color.white));

        TextView textView = new TextView(this);
        textView.setText(activity);
        textView.setPadding(16, 16, 16, 16);
        textView.setTextColor(getResources().getColor(R.color.gray_dark));

        cardView.addView(textView);
        return cardView;
    }

    @Override
    public boolean onSupportNavigateUp() {
        onBackPressed();
        return true;
    }
}