<?php
class WCGDC_Settings {
    public function __construct() {
        add_filter( 'woocommerce_settings_tabs_array', [ $this, 'add_settings_tab' ], 50 );
        add_action( 'woocommerce_settings_tabs_wcgdc_settings', [ $this, 'settings_tab_content' ] );
        add_action( 'woocommerce_update_options_wcgdc_settings', [ $this, 'update_settings' ] );
    }

    public function add_settings_tab( $settings_tabs ) {
        $settings_tabs['wcgdc_settings'] = 'Geo Delivery';
        return $settings_tabs;
    }

    public function settings_tab_content() {
        woocommerce_admin_fields( $this->get_settings() );
    }

    public function update_settings() {
        woocommerce_update_options( $this->get_settings() );
    }

    public function get_settings() {
        return [
            'section_title' => [
                'name'     => 'Configuración Global de Geo Delivery',
                'type'     => 'title',
                'desc'     => 'Configura las claves de API y la ubicación de tu tienda. Los costos se configuran en el Método de Envío (Zonas de envío).',
                'id'       => 'wcgdc_settings_section_title'
            ],
            'map_provider' => [
                'name' => 'Proveedor de Mapa',
                'type' => 'select',
                'options' => [
                    'leaflet' => 'Leaflet (OpenStreetMap)',
                    'google' => 'Google Maps'
                ],
                'id'   => 'wcgdc_map_provider',
                'default' => 'leaflet'
            ],
            'google_api_key' => [
                'name' => 'Google Maps API Key',
                'type' => 'text',
                'id'   => 'wcgdc_google_api_key',
            ],
            'leaflet_api_key' => [
                'name' => 'Leaflet / Mapbox API Key (Opcional, no requerida para OpenStreetMap base)',
                'type' => 'text',
                'id'   => 'wcgdc_leaflet_api_key',
            ],
            'store_lat' => [
                'name' => 'Latitud de la Tienda',
                'type' => 'text',
                'id'   => 'wcgdc_store_lat',
            ],
            'store_lng' => [
                'name' => 'Longitud de la Tienda',
                'type' => 'text',
                'id'   => 'wcgdc_store_lng',
            ],
            'section_end' => [
                'type' => 'sectionend',
                'id' => 'wcgdc_settings_section_end'
            ]
        ];
    }
}
