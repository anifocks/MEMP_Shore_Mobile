import { useCallback } from 'react';
import { fetchVessels } from '../api';

export const useVesselOptions = () => {
    const loadVesselOptions = useCallback((inputValue, callback) => {
        fetchVessels()
            .then(allShips => {
                const filtered = allShips.filter(s =>
                    (s.ShipName || s.shipName || '').toLowerCase().includes(inputValue.toLowerCase())
                );
                const options = filtered.map(ship => ({
                    value: ship.ShipID || ship.shipId,
                    label: ship.ShipName || ship.shipName
                }));
                callback(options);
            })
            .catch(err => {
                console.error("Error loading vessels", err);
                callback([]);
            });
    }, []);

    return loadVesselOptions;
};