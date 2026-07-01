jQuery(function($){
    let map;
    let marker;
    let isUpdating = false;

    function initMap() {
        const lat = parseFloat(wcgdc_vars.store_lat) || 0;
        const lng = parseFloat(wcgdc_vars.store_lng) || 0;
        const defaultLocation = { lat: lat, lng: lng };

        if (wcgdc_vars.provider === 'google') {
            map = new google.maps.Map(document.getElementById('wcgdc-map'), {
                center: defaultLocation,
                zoom: 13
            });

            marker = new google.maps.Marker({
                position: defaultLocation,
                map: map,
                draggable: true
            });

            google.maps.event.addListener(marker, 'dragend', function(event) {
                updateCoordinates(event.latLng.lat(), event.latLng.lng());
            });

        } else if (wcgdc_vars.provider === 'leaflet') {
            map = L.map('wcgdc-map').setView([lat, lng], 13);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(map);

            marker = L.marker([lat, lng], {draggable: true}).addTo(map);

            marker.on('dragend', function(event) {
                const position = marker.getLatLng();
                updateCoordinates(position.lat, position.lng);
            });
        }
        
        // Marker is shown at store location for reference only — no coordinates
        // are saved until the user explicitly clicks on the map or drags the marker.
        // Hidden inputs wcgdc_lat / wcgdc_lng remain empty.
    }

    function updateCoordinates(lat, lng, triggerUpdate = true) {
        $('#wcgdc_lat').val(lat);
        $('#wcgdc_lng').val(lng);
        
        if (triggerUpdate && !isUpdating) {
            isUpdating = true;
            
            const $reviewOrder = $('.woocommerce-checkout-review-order');
            if ($reviewOrder.length) {
                // Bloquea visualmente solo la sección de totales y pago
                $reviewOrder.addClass('processing').block({
                    message: null,
                    overlayCSS: { background: '#fff', opacity: 0.6 }
                });
            }

            $.ajax({
                type: 'POST',
                url: wcgdc_vars.ajax_url,
                data: {
                    action: 'wcgdc_save_coordinates',
                    nonce: wcgdc_vars.nonce,
                    lat: lat,
                    lng: lng
                },
                success: function(response) {
                    $('body').trigger('update_checkout');
                },
                complete: function() {
                    isUpdating = false;
                    if ($reviewOrder.length) {
                        $reviewOrder.removeClass('processing').unblock();
                    }
                }
            });
        } else if (!triggerUpdate) {
            // Si es la carga inicial, guarda silenciosamente sin triggerear el reload del checkout
            $.post(wcgdc_vars.ajax_url, {
                action: 'wcgdc_save_coordinates',
                nonce: wcgdc_vars.nonce,
                lat: lat,
                lng: lng
            });
        }
    }

    // Espera a que el SDK del mapa elegido esté cargado antes de inicializar
    function checkMapLoaded() {
        if (wcgdc_vars.provider === 'google' && typeof google !== 'undefined' && google.maps) {
            initMap();
        } else if (wcgdc_vars.provider === 'leaflet' && typeof L !== 'undefined') {
            initMap();
        } else {
            setTimeout(checkMapLoaded, 200);
        }
    }

    // Wait for container to be ready
    if ($('#wcgdc-map').length) {
        checkMapLoaded();
    }
    
    // Fix map rendering issues when fragments are updated
    $(document.body).on('updated_checkout', function() {
        if(wcgdc_vars.provider === 'leaflet' && map) {
            map.invalidateSize();
        }
    });
});
