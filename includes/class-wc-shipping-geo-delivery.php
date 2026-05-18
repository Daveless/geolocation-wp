<?php
class WC_Shipping_Geo_Delivery extends WC_Shipping_Method {
    public function __construct( $instance_id = 0 ) {
        $this->id                 = 'geo_delivery';
        $this->instance_id        = absint( $instance_id );
        $this->method_title       = 'Envío por Geolocalización';
        $this->method_description = 'Calcula el costo de envío basado en la distancia (radio) entre la tienda y el cliente en KM.';
        $this->supports           = [ 'shipping-zones', 'instance-settings' ];

        $this->init();
    }

    public function init() {
        $this->init_form_fields();
        $this->init_settings();

        $this->title           = $this->get_option( 'title' );
        $this->base_radius     = $this->get_option( 'base_radius' );
        $this->base_cost       = $this->get_option( 'base_cost' );
        $this->extra_cost_km   = $this->get_option( 'extra_cost_km' );

        add_action( 'woocommerce_update_options_shipping_' . $this->id, [ $this, 'process_admin_options' ] );
    }

    public function init_form_fields() {
        $this->instance_form_fields = [
            'title' => [
                'title'       => 'Título del Método',
                'type'        => 'text',
                'description' => 'El título que los usuarios verán en el checkout.',
                'default'     => 'Envío a Domicilio',
            ],
            'base_radius' => [
                'title'       => 'Radio Base (KM)',
                'type'        => 'number',
                'description' => 'Ej: 10. Los kilómetros incluidos en la tarifa base.',
                'default'     => '10',
                'custom_attributes' => ['step' => 'any']
            ],
            'base_cost' => [
                'title'       => 'Costo Base ($)',
                'type'        => 'number',
                'description' => 'Costo por estar dentro del radio base. Ej: 3',
                'default'     => '3',
                'custom_attributes' => ['step' => 'any']
            ],
            'extra_cost_km' => [
                'title'       => 'Costo Extra por KM Adicional ($)',
                'type'        => 'number',
                'description' => 'Costo por cada KM extra después del radio base. Ej: 0.25',
                'default'     => '0.25',
                'custom_attributes' => ['step' => 'any']
            ],
        ];
    }

    public function calculate_shipping( $package = [] ) {
        $lat = WC()->session->get( 'wcgdc_lat' );
        $lng = WC()->session->get( 'wcgdc_lng' );

        $store_lat = get_option( 'wcgdc_store_lat' );
        $store_lng = get_option( 'wcgdc_store_lng' );

        if ( ! $lat || ! $lng || ! $store_lat || ! $store_lng ) {
            return; // No coordinates available, cannot calculate
        }

        $distance_km = $this->haversine_distance( $store_lat, $store_lng, $lat, $lng );

        $cost = (float) $this->base_cost;
        $base_radius = (float) $this->base_radius;
        $extra_cost_km = (float) $this->extra_cost_km;

        if ( $distance_km > $base_radius ) {
            $extra_km_exact = $distance_km - $base_radius;
            $cost += ( $extra_km_exact * $extra_cost_km );
        }

        $this->add_rate( [
            'id'    => $this->get_rate_id(),
            'label' => $this->title,
            'cost'  => $cost,
            'meta_data' => [
                'Distancia (KM)' => round( $distance_km, 2 )
            ]
        ] );
    }

    private function haversine_distance( $lat1, $lon1, $lat2, $lon2 ) {
        $earth_radius = 6371; // km

        $dLat = deg2rad( $lat2 - $lat1 );
        $dLon = deg2rad( $lon2 - $lon1 );

        $a = sin( $dLat/2 ) * sin( $dLat/2 ) +
             cos( deg2rad( $lat1 ) ) * cos( deg2rad( $lat2 ) ) *
             sin( $dLon/2 ) * sin( $dLon/2 );
        $c = 2 * asin( sqrt( $a ) );
        
        return $earth_radius * $c;
    }
}
