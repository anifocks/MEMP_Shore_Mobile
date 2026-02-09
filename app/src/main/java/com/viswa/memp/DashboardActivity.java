package com.viswa.memp;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.GridLayout;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import androidx.cardview.widget.CardView;
import com.google.android.material.appbar.MaterialToolbar;

public class DashboardActivity extends AppCompatActivity {

    private GridLayout menuGrid;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_dashboard);

        MaterialToolbar toolbar = findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);
        getSupportActionBar().setTitle("MEMP Dashboard");

        menuGrid = findViewById(R.id.menuGrid);
        setupMenuItems();
    }

    private void setupMenuItems() {
        String[] menuTitles = {
            "MEMP Overview", "Vessel Info", "Machinery", "Ports",
            "Voyages", "Bunkering", "Vessel Reports", "Compliances",
            "Additives", "User Management", "Fleet Management", "Team"
        };

        Class<?>[] activities = {
            MEMPOverviewActivity.class, VesselInfoActivity.class, MachineryActivity.class, PortManagementActivity.class,
            VoyageManagementActivity.class, BunkerManagementActivity.class, VesselReportsActivity.class, CompliancesActivity.class,
            AdditiveActivity.class, UserManagementActivity.class, FleetManagementActivity.class, TeamActivity.class
        };

        for (int i = 0; i < menuTitles.length; i++) {
            CardView cardView = createMenuCard(menuTitles[i], activities[i]);
            menuGrid.addView(cardView);
        }
    }

    private CardView createMenuCard(String title, final Class<?> activityClass) {
        CardView cardView = new CardView(this);
        GridLayout.LayoutParams params = new GridLayout.LayoutParams();
        params.width = 0;
        params.height = GridLayout.LayoutParams.WRAP_CONTENT;
        params.columnSpec = GridLayout.spec(GridLayout.UNDEFINED, 1f);
        params.rowSpec = GridLayout.spec(GridLayout.UNDEFINED, 1f);
        params.setMargins(8, 8, 8, 8);
        cardView.setLayoutParams(params);
        cardView.setCardElevation(4);
        cardView.setRadius(8);
        cardView.setCardBackgroundColor(getResources().getColor(R.color.primary));

        TextView textView = new TextView(this);
        textView.setText(title);
        textView.setTextColor(getResources().getColor(R.color.white));
        textView.setTextSize(14);
        textView.setPadding(16, 16, 16, 16);
        textView.setGravity(android.view.Gravity.CENTER);

        cardView.addView(textView);
        cardView.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Intent intent = new Intent(DashboardActivity.this, activityClass);
                startActivity(intent);
            }
        });

        return cardView;
    }
}