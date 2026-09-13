import type { GeoPoint, Place, PlaceCategory } from '@/types/domain';
import { sortPlacesByCategoryPopularity } from '@/utils/place-popularity';

type WorldEntry = {
  id: string;
  name: string;
  category: PlaceCategory;
  latitude: number;
  longitude: number;
  address?: string;
  rating?: number;
  reviewCount?: number;
  tags?: string[];
  /** Optional Wikimedia/Openverse URL so cards never depend on live search. */
  photoUrl?: string;
};

function e(
  id: string,
  name: string,
  category: PlaceCategory,
  latitude: number,
  longitude: number,
  address: string,
  rating: number,
  reviewCount: number,
  tags: string[] = [],
  photoUrl?: string,
): WorldEntry {
  return { id, name, category, latitude, longitude, address, rating, reviewCount, tags, photoUrl };
}

/**
 * Curated worldwide destinations: famous landmarks, places people actually go,
 * and underrated / local favorites. Always merged into Explore + Trip Suggestion.
 */
const WORLD: WorldEntry[] = [
  // ——— Japan · Tokyo ———
  e('w-tokyo-sensoji', 'Sensō-ji (Asakusa)', 'temple', 35.7148, 139.7967, 'Asakusa, Tokyo', 4.7, 80_000, ['famous', 'temple']),
  e('w-tokyo-tower', 'Tokyo Tower', 'attraction', 35.6586, 139.7454, 'Minato, Tokyo', 4.5, 70_000, ['famous', 'tower']),
  e('w-tokyo-shibuya', 'Shibuya Crossing', 'attraction', 35.6595, 139.7005, 'Shibuya, Tokyo', 4.6, 50_000, ['famous', 'landmark']),
  e('w-tokyo-meiji', 'Meiji Jingu', 'temple', 35.6764, 139.6993, 'Shibuya, Tokyo', 4.7, 45_000, ['famous', 'shrine']),
  e('w-tokyo-skytree', 'Tokyo Skytree', 'attraction', 35.7101, 139.8107, 'Sumida, Tokyo', 4.5, 60_000, ['famous', 'tower']),
  e('w-tokyo-ueno', 'Ueno Park', 'park', 35.7147, 139.7714, 'Taito, Tokyo', 4.5, 30_000, ['park']),
  e('w-tokyo-imperial', 'Imperial Palace East Gardens', 'park', 35.6852, 139.7528, 'Chiyoda, Tokyo', 4.5, 20_000, ['park']),
  e('w-tokyo-disney', 'Tokyo Disneyland', 'attraction', 35.6329, 139.8804, 'Urayasu, Chiba', 4.6, 100_000, ['famous', 'theme park', 'family']),
  e('w-tokyo-disneysea', 'Tokyo DisneySea', 'attraction', 35.6267, 139.8851, 'Urayasu, Chiba', 4.7, 90_000, ['famous', 'theme park', 'family']),
  e('w-tokyo-ghibli', 'Ghibli Museum', 'museum', 35.6962, 139.5704, 'Mitaka, Tokyo', 4.6, 40_000, ['famous', 'museum', 'family']),
  e('w-tokyo-teamlab', 'teamLab Planets', 'museum', 35.649, 139.7898, 'Toyosu, Tokyo', 4.6, 35_000, ['famous', 'museum']),
  e('w-tokyo-tsukiji', 'Toyosu / Tsukiji Outer Market', 'market', 35.665, 139.7707, 'Tokyo', 4.5, 25_000, ['market', 'food']),
  e('w-tokyo-akihabara', 'Akihabara Electric Town', 'shopping', 35.6984, 139.7731, 'Chiyoda, Tokyo', 4.4, 30_000, ['shopping']),
  e('w-tokyo-harajuku', 'Takeshita Street (Harajuku)', 'shopping', 35.6702, 139.7027, 'Shibuya, Tokyo', 4.3, 28_000, ['shopping']),
  e('w-tokyo-shinjuku-gyoen', 'Shinjuku Gyoen', 'park', 35.6852, 139.71, 'Shinjuku, Tokyo', 4.6, 22_000, ['park', 'underrated']),
  e('w-tokyo-odaiba', 'Odaiba Seaside Park', 'park', 35.629, 139.775, 'Odaiba, Tokyo', 4.4, 18_000, ['viewpoint']),
  e('w-tokyo-yanaka', 'Yanaka Ginza', 'attraction', 35.727, 139.766, 'Taito, Tokyo', 4.5, 8_000, ['underrated', 'local']),
  e('w-tokyo-koishikawa', 'Koishikawa Korakuen', 'park', 35.7054, 139.7495, 'Bunkyo, Tokyo', 4.6, 7_000, ['underrated', 'garden']),
  e('w-tokyo-ichiran', 'Ichiran Shibuya', 'restaurant', 35.6598, 139.7009, 'Shibuya, Tokyo', 4.4, 12_000, ['ramen']),
  e('w-tokyo-afuri', 'Afuri Ramen Ebisu', 'restaurant', 35.6467, 139.7101, 'Ebisu, Tokyo', 4.4, 5_000, ['ramen']),
  e('w-tokyo-kitsune', 'Café Kitsuné Shibuya', 'cafe', 35.6612, 139.6988, 'Shibuya, Tokyo', 4.3, 2_000, ['cafe']),

  // ——— Japan · Kyoto / Nara / Osaka / Fuji ———
  e('w-kyoto-fushimi', 'Fushimi Inari Taisha', 'temple', 34.9671, 135.7727, 'Kyoto', 4.7, 90_000, ['famous', 'shrine']),
  e('w-kyoto-kiyomizu', 'Kiyomizu-dera', 'temple', 34.9949, 135.785, 'Kyoto', 4.7, 70_000, ['famous', 'temple']),
  e('w-kyoto-arashiyama', 'Arashiyama Bamboo Grove', 'attraction', 35.017, 135.6722, 'Kyoto', 4.5, 60_000, ['famous']),
  e('w-kyoto-gion', 'Gion District', 'attraction', 35.0037, 135.7788, 'Kyoto', 4.5, 40_000, ['famous']),
  e('w-kyoto-golden', 'Kinkaku-ji (Golden Pavilion)', 'temple', 35.0394, 135.7292, 'Kyoto', 4.6, 80_000, ['famous']),
  e('w-kyoto-philosopher', "Philosopher's Path", 'attraction', 35.026, 135.796, 'Kyoto', 4.5, 15_000, ['underrated', 'walk']),
  e('w-kyoto-nishiki', 'Nishiki Market', 'market', 35.005, 135.7649, 'Kyoto', 4.4, 25_000, ['market', 'food']),
  e('w-nara-park', 'Nara Park', 'park', 34.6851, 135.843, 'Nara', 4.6, 50_000, ['famous', 'deer']),
  e('w-nara-todaiji', 'Tōdai-ji', 'temple', 34.689, 135.8398, 'Nara', 4.7, 45_000, ['famous', 'temple']),
  e('w-osaka-castle', 'Osaka Castle', 'attraction', 34.6873, 135.5262, 'Osaka', 4.6, 55_000, ['famous', 'castle']),
  e('w-osaka-dotonbori', 'Dotonbori', 'attraction', 34.6687, 135.5013, 'Osaka', 4.5, 40_000, ['famous', 'nightlife']),
  e('w-osaka-kuromon', 'Kuromon Market', 'market', 34.659, 135.5063, 'Osaka', 4.4, 15_000, ['market']),
  e('w-osaka-usj', 'Universal Studios Japan', 'attraction', 34.6654, 135.4323, 'Osaka', 4.5, 70_000, ['famous', 'theme park', 'family']),
  e('w-osaka-shinsekai', 'Shinsekai / Tsutenkaku', 'attraction', 34.6525, 135.5064, 'Osaka', 4.3, 20_000, ['local']),
  e('w-osaka-kushikatsu', 'Kushikatsu Daruma Shinsekai', 'restaurant', 34.6525, 135.5062, 'Osaka', 4.3, 8_000, ['local']),
  e('w-fuji-kawaguchi', 'Lake Kawaguchi', 'viewpoint', 35.517, 138.755, 'Yamanashi', 4.6, 30_000, ['famous', 'mt fuji']),
  e('w-fuji-chureito', 'Chureito Pagoda Viewpoint', 'viewpoint', 35.501, 138.801, 'Fujiyoshida', 4.7, 25_000, ['famous', 'mt fuji']),
  e('w-hiroshima-peace', 'Hiroshima Peace Memorial Park', 'park', 34.3955, 132.4536, 'Hiroshima', 4.7, 40_000, ['famous', 'historic']),
  e('w-miyajima-itsukushima', 'Itsukushima Shrine (Miyajima)', 'temple', 34.296, 132.3198, 'Miyajima', 4.7, 35_000, ['famous']),

  // ——— Korea ———
  e('w-seoul-gyeongbok', 'Gyeongbokgung Palace', 'attraction', 37.5796, 126.977, 'Seoul', 4.7, 70_000, ['famous', 'palace']),
  e('w-seoul-bukchon', 'Bukchon Hanok Village', 'attraction', 37.5826, 126.9831, 'Seoul', 4.5, 25_000, ['famous', 'village']),
  e('w-seoul-namsan', 'N Seoul Tower', 'attraction', 37.5512, 126.9882, 'Seoul', 4.5, 50_000, ['famous', 'tower']),
  e('w-seoul-myeongdong', 'Myeongdong Street Food', 'restaurant', 37.5636, 126.985, 'Seoul', 4.3, 10_000, ['street food']),
  e('w-seoul-hongdae', 'Hongdae', 'nightlife', 37.5563, 126.9236, 'Seoul', 4.4, 20_000, ['nightlife']),
  e('w-seoul-dongdaemun', 'Dongdaemun Design Plaza', 'attraction', 37.5668, 127.0094, 'Seoul', 4.4, 22_000, ['landmark']),
  e('w-seoul-insadong', 'Insadong', 'shopping', 37.574, 126.9857, 'Seoul', 4.4, 18_000, ['shopping', 'culture']),
  e('w-seoul-lotte', 'Lotte World Tower / Seoul Sky', 'attraction', 37.5125, 127.1025, 'Seoul', 4.5, 30_000, ['famous', 'tower']),
  e('w-seoul-changdeok', 'Changdeokgung Palace', 'attraction', 37.5794, 126.991, 'Seoul', 4.6, 20_000, ['underrated', 'palace']),
  e('w-seoul-ikseon', 'Ikseon-dong Hanok Street', 'attraction', 37.5745, 126.99, 'Seoul', 4.5, 8_000, ['underrated', 'local']),
  e('w-busan-haeundae', 'Haeundae Beach', 'beach', 35.1587, 129.1604, 'Busan', 4.5, 35_000, ['famous', 'beach']),
  e('w-busan-gamcheon', 'Gamcheon Culture Village', 'attraction', 35.0975, 129.0106, 'Busan', 4.5, 25_000, ['famous']),
  e('w-busan-jagalchi', 'Jagalchi Market', 'market', 35.0966, 129.0306, 'Busan', 4.3, 15_000, ['market']),

  // ——— Hong Kong ———
  e('w-hk-peak', 'Victoria Peak', 'viewpoint', 22.2759, 114.1455, 'The Peak, Hong Kong', 4.6, 80_000, ['famous', 'viewpoint']),
  e('w-hk-peak-tram', 'Peak Tram', 'attraction', 22.2783, 114.1595, 'Central, Hong Kong', 4.5, 35_000, ['famous', 'tram']),
  e('w-hk-peak-tower', 'Peak Tower', 'attraction', 22.2714, 114.1499, 'The Peak, Hong Kong', 4.4, 20_000, ['viewpoint']),
  e('w-hk-disneyland', 'Hong Kong Disneyland', 'attraction', 22.3132, 114.0413, "Penny's Bay, Lantau", 4.6, 90_000, ['famous', 'theme park', 'family']),
  e('w-hk-ocean-park', 'Ocean Park Hong Kong', 'zoo', 22.2465, 114.1756, 'Aberdeen, Hong Kong', 4.5, 55_000, ['famous', 'theme park', 'family']),
  e('w-hk-ngong-ping-360', 'Ngong Ping 360 Cable Car', 'attraction', 22.2555, 113.9425, 'Lantau, Hong Kong', 4.5, 40_000, ['famous', 'cable car']),
  e('w-hk-ngong-ping-village', 'Ngong Ping Village', 'attraction', 22.2558, 113.9039, 'Ngong Ping, Lantau', 4.3, 12_000, ['village']),
  e('w-hk-tian-tan', 'Tian Tan Buddha (Big Buddha)', 'temple', 22.254, 113.9051, 'Ngong Ping, Lantau', 4.6, 45_000, ['famous', 'buddha']),
  e('w-hk-po-lin', 'Po Lin Monastery', 'temple', 22.2556, 113.9077, 'Ngong Ping, Lantau', 4.5, 18_000, ['temple']),
  e('w-hk-symphony', 'Avenue of Stars', 'attraction', 22.293, 114.174, 'Tsim Sha Tsui', 4.4, 30_000, ['waterfront']),
  e('w-hk-harbour', 'Victoria Harbour', 'attraction', 22.2875, 114.1736, 'Hong Kong', 4.7, 70_000, ['famous', 'harbour']),
  e('w-hk-star-ferry', 'Star Ferry Pier (Tsim Sha Tsui)', 'attraction', 22.294, 114.1684, 'Tsim Sha Tsui', 4.5, 25_000, ['famous', 'ferry']),
  e('w-hk-symphony-show', 'A Symphony of Lights viewpoint', 'viewpoint', 22.2945, 114.172, 'TST Promenade', 4.4, 15_000, ['night show']),
  e('w-hk-ladies-market', "Ladies' Market", 'market', 22.3193, 114.1705, 'Mong Kok', 4.2, 20_000, ['market']),
  e('w-hk-temple-street', 'Temple Street Night Market', 'market', 22.3065, 114.1702, 'Yau Ma Tei', 4.3, 22_000, ['night market']),
  e('w-hk-man-mo', 'Man Mo Temple', 'temple', 22.284, 114.1502, 'Sheung Wan', 4.4, 12_000, ['temple']),
  e('w-hk-wong-tai-sin', 'Wong Tai Sin Temple', 'temple', 22.3425, 114.1937, 'Wong Tai Sin', 4.5, 18_000, ['temple']),
  e('w-hk-nan-lian', 'Nan Lian Garden', 'park', 22.339, 114.205, 'Diamond Hill', 4.6, 14_000, ['underrated', 'garden']),
  e('w-hk-chi-lin', 'Chi Lin Nunnery', 'temple', 22.3387, 114.2047, 'Diamond Hill', 4.6, 16_000, ['underrated', 'temple']),
  e('w-hk-museum-history', 'Hong Kong Museum of History', 'museum', 22.3017, 114.1772, 'Tsim Sha Tsui', 4.5, 12_000, ['museum']),
  e('w-hk-science-museum', 'Hong Kong Science Museum', 'museum', 22.3011, 114.1778, 'Tsim Sha Tsui', 4.4, 10_000, ['museum', 'family']),
  e('w-hk-ifc', 'IFC Mall', 'mall', 22.285, 114.158, 'Central', 4.4, 25_000, ['mall']),
  e('w-hk-harbour-city', 'Harbour City', 'mall', 22.2955, 114.168, 'Tsim Sha Tsui', 4.4, 28_000, ['mall']),
  e('w-hk-tai-o', 'Tai O Fishing Village', 'attraction', 22.2545, 113.863, 'Lantau', 4.4, 12_000, ['underrated', 'village']),
  e('w-hk-dragon-back', 'Dragon’s Back Trail', 'park', 22.235, 114.242, 'Hong Kong Island', 4.6, 15_000, ['underrated', 'hike']),
  e('w-hk-stanley', 'Stanley Market & Promenade', 'market', 22.218, 114.212, 'Stanley', 4.3, 14_000, ['market', 'local']),
  e('w-hk-m-plus', 'M+ Museum', 'museum', 22.302, 114.16, 'West Kowloon', 4.5, 9_000, ['underrated', 'museum']),
  e('w-hk-dimsum', 'Tim Ho Wan Central', 'restaurant', 22.2819, 114.155, 'Hong Kong', 4.3, 8_000, ['dim sum']),
  e('w-hk-michelin-noodle', 'Tsim Chai Kee Noodle', 'restaurant', 22.2835, 114.1528, 'Central', 4.3, 6_000, ['noodles']),

  // ——— Singapore ———
  e('w-sg-marina', 'Marina Bay Sands', 'attraction', 1.2834, 103.8607, 'Singapore', 4.6, 90_000, ['famous']),
  e('w-sg-gardens', 'Gardens by the Bay', 'park', 1.2816, 103.8636, 'Singapore', 4.7, 70_000, ['famous']),
  e('w-sg-merlion', 'Merlion Park', 'attraction', 1.2868, 103.8545, 'Singapore', 4.4, 50_000, ['famous']),
  e('w-sg-sentosa', 'Sentosa Island', 'attraction', 1.2494, 103.8303, 'Singapore', 4.5, 40_000, ['famous', 'family']),
  e('w-sg-uss', 'Universal Studios Singapore', 'attraction', 1.254, 103.8238, 'Sentosa', 4.5, 45_000, ['theme park', 'family']),
  e('w-sg-chinatown', 'Chinatown Singapore', 'attraction', 1.2839, 103.844, 'Singapore', 4.4, 25_000, ['culture']),
  e('w-sg-orchard', 'Orchard Road', 'shopping', 1.3048, 103.8318, 'Singapore', 4.4, 30_000, ['shopping']),
  e('w-sg-hawker', 'Maxwell Food Centre', 'restaurant', 1.2804, 103.8445, 'Singapore', 4.4, 15_000, ['hawker']),
  e('w-sg-holland', 'Holland Village', 'nightlife', 1.311, 103.796, 'Singapore', 4.3, 8_000, ['underrated', 'local']),
  e('w-sg-botanic', 'Singapore Botanic Gardens', 'park', 1.3138, 103.8159, 'Singapore', 4.7, 35_000, ['underrated', 'unesco']),

  // ——— Thailand ———
  e('w-bkk-wat-pho', 'Wat Pho', 'temple', 13.7465, 100.4935, 'Bangkok', 4.7, 60_000, ['famous']),
  e('w-bkk-grand', 'Grand Palace', 'attraction', 13.75, 100.4914, 'Bangkok', 4.6, 80_000, ['famous']),
  e('w-bkk-wat-arun', 'Wat Arun', 'temple', 13.7437, 100.4889, 'Bangkok', 4.7, 55_000, ['famous']),
  e('w-bkk-chatuchak', 'Chatuchak Weekend Market', 'market', 13.7999, 100.5504, 'Bangkok', 4.5, 40_000, ['famous', 'market']),
  e('w-bkk-asiatique', 'Asiatique The Riverfront', 'shopping', 13.704, 100.503, 'Bangkok', 4.3, 20_000, ['nightlife']),
  e('w-bkk-chinatown', 'Yaowarat Chinatown', 'attraction', 13.7398, 100.51, 'Bangkok', 4.4, 22_000, ['food']),
  e('w-bkk-lumpini', 'Lumphini Park', 'park', 13.7308, 100.5418, 'Bangkok', 4.5, 15_000, ['underrated', 'park']),
  e('w-bkk-jim', "Jim Thompson's House", 'museum', 13.749, 100.528, 'Bangkok', 4.5, 12_000, ['underrated']),
  e('w-bkk-jay-fai', 'Thip Samai (Pad Thai)', 'restaurant', 13.7528, 100.504, 'Bangkok', 4.4, 9_000, ['thai']),
  e('w-chiangmai-doi', 'Doi Suthep Temple', 'temple', 18.8047, 98.9215, 'Chiang Mai', 4.7, 40_000, ['famous']),
  e('w-chiangmai-night', 'Chiang Mai Night Bazaar', 'market', 18.787, 99.0005, 'Chiang Mai', 4.3, 18_000, ['market']),
  e('w-phuket-patong', 'Patong Beach', 'beach', 7.896, 98.296, 'Phuket', 4.2, 30_000, ['famous', 'beach']),
  e('w-phuket-big-buddha', 'Big Buddha Phuket', 'temple', 7.8277, 98.3128, 'Phuket', 4.6, 25_000, ['famous']),

  // ——— Vietnam / Indonesia / Malaysia ———
  e('w-hanoi-old', 'Hanoi Old Quarter', 'attraction', 21.034, 105.852, 'Hanoi, Vietnam', 4.5, 40_000, ['famous']),
  e('w-hanoi-hoankiem', 'Hoan Kiem Lake', 'park', 21.0288, 105.852, 'Hanoi, Vietnam', 4.5, 25_000, ['famous']),
  e('w-hanoi-temple', 'Temple of Literature', 'temple', 21.028, 105.8355, 'Hanoi, Vietnam', 4.6, 18_000, ['famous']),
  e('w-sapa-town', 'Sa Pa Town Center', 'attraction', 22.3364, 103.8438, 'Sa Pa, Vietnam', 4.5, 12_000, ['famous', 'local']),
  e('w-sapa-fansipan', 'Fansipan Peak / Cable Car', 'viewpoint', 22.304, 103.775, 'Sa Pa, Vietnam', 4.7, 20_000, ['famous', 'viewpoint']),
  e('w-sapa-catcat', 'Cat Cat Village', 'attraction', 22.323, 103.832, 'Sa Pa, Vietnam', 4.5, 9_000, ['local', 'famous']),
  e('w-sapa-hamrong', 'Ham Rong Mountain', 'attraction', 22.341, 103.847, 'Sa Pa, Vietnam', 4.4, 6_000, ['local']),
  e('w-hcmc-ben-thanh', 'Ben Thanh Market', 'market', 10.772, 106.698, 'Ho Chi Minh City, Vietnam', 4.3, 30_000, ['market']),
  e('w-hcmc-notre', 'Notre-Dame Cathedral Basilica of Saigon', 'temple', 10.7798, 106.699, 'Ho Chi Minh City, Vietnam', 4.5, 20_000, ['famous']),
  e('w-danang-marble', 'Marble Mountains', 'attraction', 16.0039, 108.2638, 'Da Nang, Vietnam', 4.6, 22_000, ['famous']),
  e('w-hoian-ancient', 'Hoi An Ancient Town', 'attraction', 15.8801, 108.338, 'Hoi An, Vietnam', 4.7, 45_000, ['famous', 'unesco']),
  e('w-bali-uluwatu', 'Uluwatu Temple', 'temple', -8.8291, 115.0849, 'Bali', 4.6, 40_000, ['famous']),
  e('w-bali-tegallalang', 'Tegallalang Rice Terrace', 'attraction', -8.4312, 115.2792, 'Bali', 4.5, 35_000, ['famous']),
  e('w-bali-ubud', 'Ubud Monkey Forest', 'park', -8.5189, 115.2592, 'Bali', 4.4, 30_000, ['famous']),
  e('w-bali-seminyak', 'Seminyak Beach', 'beach', -8.691, 115.157, 'Bali', 4.4, 20_000, ['beach']),
  e('w-kl-petronas', 'Petronas Twin Towers', 'attraction', 3.1579, 101.7116, 'Kuala Lumpur', 4.6, 80_000, ['famous']),
  e('w-kl-batu', 'Batu Caves', 'temple', 3.2379, 101.684, 'Kuala Lumpur', 4.5, 45_000, ['famous']),
  e('w-kl-bukit', 'Bukit Bintang', 'shopping', 3.1466, 101.711, 'Kuala Lumpur', 4.4, 25_000, ['shopping', 'nightlife']),
  e('w-penang-georgetown', 'George Town Street Art', 'attraction', 5.4141, 100.3288, 'Penang', 4.5, 20_000, ['underrated', 'culture']),

  // ——— Philippines ———
  e('w-mnl-intramuros', 'Intramuros', 'attraction', 14.5896, 120.9747, 'Manila', 4.5, 25_000, ['famous', 'historic']),
  e('w-mnl-rizal', 'Rizal Park', 'park', 14.5832, 120.9794, 'Manila', 4.4, 18_000, ['park']),
  e('w-mnl-binondo', 'Binondo Chinatown', 'attraction', 14.602, 120.975, 'Manila', 4.4, 12_000, ['food']),
  e('w-mnl-moa', 'SM Mall of Asia', 'mall', 14.535, 120.982, 'Pasay', 4.4, 30_000, ['mall']),
  e('w-mnl-bgc', 'Bonifacio High Street', 'shopping', 14.551, 121.05, 'Taguig', 4.4, 15_000, ['shopping']),
  e('w-mnl-national', 'National Museum of Fine Arts', 'museum', 14.5869, 120.981, 'Manila', 4.6, 8_000, ['underrated', 'museum']),
  e('w-mnl-jollibee', 'Jollibee Quiapo', 'restaurant', 14.5985, 120.9835, 'Manila', 4.2, 5_000, ['local']),
  e('w-cebu-magellan', "Magellan's Cross", 'attraction', 10.293, 123.902, 'Cebu', 4.3, 12_000, ['historic']),
  e('w-boracay-white', 'White Beach Boracay', 'beach', 11.967, 121.925, 'Boracay', 4.6, 40_000, ['famous', 'beach']),
  e('w-palawan-underground', 'Puerto Princesa Underground River', 'attraction', 10.192, 118.926, 'Palawan', 4.7, 25_000, ['famous', 'unesco']),
  e('w-elnido-beach', 'El Nido Lagoons', 'beach', 11.179, 119.39, 'El Nido', 4.7, 30_000, ['famous', 'beach']),

  // Sorsogon / Bicol
  e('w-sorsogon-capitol', 'Sorsogon Provincial Capitol Park', 'park', 12.9742, 124.0048, 'Sorsogon City', 4.4, 2_800, ['park', 'landmark', 'local']),
  e('w-sorsogon-boulevard', 'Sorsogon City Boulevard / Rompeolas', 'viewpoint', 12.9688, 124.0125, 'Sorsogon City', 4.5, 3_400, ['viewpoint', 'local', 'famous'], 'https://upload.wikimedia.org/wikipedia/commons/4/41/Sunrise_in_Sorsogon_Rompeolas.jpg'),
  e('w-sorsogon-museum', 'Sorsogon Museum and Heritage Center', 'museum', 12.9725, 124.0059, 'Sorsogon City', 4.3, 1_200, ['museum', 'culture']),
  e('w-sorsogon-cathedral', 'Sts. Peter and Paul Cathedral', 'temple', 12.9736, 124.0068, 'Sorsogon City', 4.6, 2_100, ['church', 'landmark']),
  e('w-sorsogon-rizal-beach', 'Rizal Beach (Gubat)', 'beach', 12.9205, 124.1232, 'Gubat, Sorsogon', 4.6, 4_500, ['beach', 'famous', 'local']),
  e('w-sorsogon-bulusan', 'Bulusan Lake', 'lake', 12.769, 124.056, 'Bulusan, Sorsogon', 4.7, 6_800, ['nature', 'famous', 'lake', 'park']),
  e('w-sorsogon-barcelona', 'Barcelona Ruins Church (St. Joseph Parish)', 'temple', 12.866, 124.14, 'Barcelona, Sorsogon', 4.6, 3_800, ['historic', 'church', 'famous', 'local']),
  e('w-sorsogon-barcelona-ruins-park', 'Barcelona Ruins Park / Presidencia', 'attraction', 12.8665, 124.1405, 'Barcelona, Sorsogon', 4.5, 2_200, ['historic', 'local', 'underrated']),
  e('w-sorsogon-barcelona-seawall', 'Barcelona Sea Wall', 'viewpoint', 12.8648, 124.1428, 'Barcelona, Sorsogon', 4.4, 1_600, ['viewpoint', 'local', 'coast']),
  e('w-sorsogon-barcelona-bridge', 'Vintage Bridge of 1939 (Barcelona)', 'attraction', 12.8672, 124.1392, 'Barcelona, Sorsogon', 4.3, 980, ['historic', 'local', 'photo']),
  e('w-sorsogon-barcelona-hall', 'Barcelona Town Hall', 'attraction', 12.868, 124.141, 'Barcelona, Sorsogon', 4.3, 1_100, ['historic', 'architecture', 'local']),
  e('w-sorsogon-agrihope', 'AgriHope Tourism Farm', 'attraction', 12.875, 124.135, 'Barcelona, Sorsogon', 4.5, 1_400, ['farm', 'family', 'local', 'underrated']),
  e('w-sorsogon-paguriran', 'Paguriran Island / Rock Formation', 'beach', 12.906, 124.148, 'Barcelona, Sorsogon', 4.7, 5_200, ['beach', 'famous', 'underrated', 'island'], 'https://upload.wikimedia.org/wikipedia/commons/d/da/Magnificent_View_of_Mayon_at_Paguriran_Island,_Bacon,_Sorsogon.jpg'),
  e('w-sorsogon-paguriran-cove', 'Paguriran Cove Swim Spot', 'beach', 12.9045, 124.1468, 'Barcelona, Sorsogon', 4.6, 2_900, ['beach', 'swim', 'local'], 'https://upload.wikimedia.org/wikipedia/commons/d/da/Magnificent_View_of_Mayon_at_Paguriran_Island,_Bacon,_Sorsogon.jpg'),
  e('w-sorsogon-palogtoc', 'Palogtoc Falls / Cold Spring', 'cold_spring', 12.702, 124.032, 'Irosin, Sorsogon', 4.6, 3_100, ['cold spring', 'waterfall', 'nature', 'famous']),
  e('w-sorsogon-san-benon', 'San Benon Hot Springs', 'hot_spring', 12.7055, 124.018, 'Irosin, Sorsogon', 4.5, 2_400, ['hot spring', 'spa', 'nature', 'local']),
  e('w-sorsogon-tongig', 'Tongig Hot Spring', 'hot_spring', 12.71, 124.01, 'Irosin, Sorsogon', 4.3, 980, ['hot spring', 'local']),
  e('w-sorsogon-matnog', 'Matnog Ferry Terminal Beaches', 'beach', 12.585, 124.085, 'Matnog, Sorsogon', 4.4, 2_200, ['beach', 'island hop', 'local']),
  e('w-sorsogon-juag', 'Juag Lagoon Fish Sanctuary', 'lake', 12.575, 124.12, 'Matnog, Sorsogon', 4.6, 1_800, ['lagoon', 'nature', 'underrated']),
  e('w-sorsogon-bulusan-resort', 'Bulusan Lake View Resort Area', 'resort', 12.771, 124.055, 'Bulusan, Sorsogon', 4.4, 1_500, ['resort', 'lake', 'nature']),
  e('w-sorsogon-rizal-resort', 'Rizal Beach Resort Strip (Gubat)', 'resort', 12.9195, 124.124, 'Gubat, Sorsogon', 4.3, 1_900, ['resort', 'beach', 'local']),
  e('w-sorsogon-donsol', 'Donsol Whale Shark Interaction Area', 'attraction', 12.908, 123.598, 'Donsol, Sorsogon', 4.8, 9_500, ['famous', 'nature']),
  e('w-sorsogon-sm', 'SM City Sorsogon', 'mall', 12.9805, 123.9938, 'Sorsogon City', 4.3, 3_600, ['mall', 'shopping', 'local']),
  e('w-sorsogon-pepper', 'Pepper Lunch Sorsogon', 'restaurant', 12.9758, 124.0012, 'Sorsogon City', 4.2, 1_100, ['local']),
  e('w-sorsogon-jollibee', 'Jollibee Sorsogon City', 'restaurant', 12.9749, 124.0035, 'Sorsogon City', 4.3, 2_600, ['local', 'family']),
  e('w-sorsogon-max', "Max's Restaurant Sorsogon", 'restaurant', 12.9762, 124.0021, 'Sorsogon City', 4.4, 1_800, ['local', 'family']),
  e('w-sorsogon-gubat-market', 'Gubat Public Market Eats', 'restaurant', 12.9188, 124.1205, 'Gubat, Sorsogon', 4.2, 900, ['local', 'market']),
  e('w-sorsogon-barcelona-eats', 'Barcelona Town Plaza Eateries', 'restaurant', 12.8685, 124.1412, 'Barcelona, Sorsogon', 4.1, 720, ['local', 'family']),
  e('w-legazpi-cagsawa', 'Cagsawa Ruins', 'attraction', 13.1658, 123.7125, 'Daraga, Albay', 4.7, 18_000, ['famous', 'historic']),
  e('w-legazpi-mayon', 'Mayon Volcano View Deck (Legazpi)', 'viewpoint', 13.1391, 123.7438, 'Legazpi', 4.8, 22_000, ['famous', 'viewpoint']),

  // ——— China / Taiwan ———
  e('w-shanghai-bund', 'The Bund', 'viewpoint', 31.240, 121.490, 'Shanghai', 4.7, 90_000, ['famous']),
  e('w-shanghai-yu', 'Yu Garden', 'park', 31.227, 121.492, 'Shanghai', 4.5, 40_000, ['famous']),
  e('w-beijing-forbidden', 'Forbidden City', 'attraction', 39.9163, 116.3972, 'Beijing', 4.7, 120_000, ['famous']),
  e('w-beijing-wall', 'Great Wall (Mutianyu)', 'attraction', 40.431, 116.570, 'Beijing', 4.7, 100_000, ['famous']),
  e('w-beijing-temple', 'Temple of Heaven', 'temple', 39.8822, 116.4066, 'Beijing', 4.7, 50_000, ['famous']),
  e('w-taipei-101', 'Taipei 101', 'attraction', 25.033, 121.5654, 'Taipei', 4.6, 70_000, ['famous', 'tower']),
  e('w-taipei-night', 'Shilin Night Market', 'market', 25.088, 121.524, 'Taipei', 4.4, 35_000, ['night market']),
  e('w-taipei-palace', 'National Palace Museum', 'museum', 25.1023, 121.5485, 'Taipei', 4.7, 40_000, ['famous', 'museum']),
  e('w-taipei-jiufen', 'Jiufen Old Street', 'attraction', 25.109, 121.845, 'New Taipei', 4.5, 30_000, ['famous']),

  // ——— Europe · West ———
  e('w-paris-eiffel', 'Eiffel Tower', 'attraction', 48.8584, 2.2945, 'Paris', 4.7, 200_000, ['famous']),
  e('w-paris-louvre', 'Louvre Museum', 'museum', 48.8606, 2.3376, 'Paris', 4.7, 180_000, ['famous']),
  e('w-paris-notre', 'Notre-Dame Cathedral', 'temple', 48.853, 2.3499, 'Paris', 4.7, 100_000, ['famous']),
  e('w-paris-arc', 'Arc de Triomphe', 'attraction', 48.8738, 2.295, 'Paris', 4.7, 90_000, ['famous']),
  e('w-paris-sacre', 'Sacré-Cœur', 'temple', 48.8867, 2.3431, 'Paris', 4.7, 80_000, ['famous']),
  e('w-paris-orsay', "Musée d'Orsay", 'museum', 48.86, 2.3266, 'Paris', 4.7, 70_000, ['famous']),
  e('w-paris-luxembourg', 'Jardin du Luxembourg', 'park', 48.8462, 2.3372, 'Paris', 4.7, 40_000, ['underrated', 'park']),
  e('w-paris-marais', 'Le Marais', 'attraction', 48.857, 2.36, 'Paris', 4.6, 25_000, ['local', 'shopping']),
  e('w-paris-cafe', 'Café de Flore', 'cafe', 48.8541, 2.3325, 'Paris', 4.2, 15_000, ['cafe']),
  e('w-ldn-bridge', 'Tower Bridge', 'attraction', 51.5055, -0.0754, 'London', 4.7, 90_000, ['famous']),
  e('w-ldn-british', 'British Museum', 'museum', 51.5194, -0.127, 'London', 4.7, 120_000, ['famous']),
  e('w-ldn-hyde', 'Hyde Park', 'park', 51.5073, -0.1657, 'London', 4.7, 80_000, ['park']),
  e('w-ldn-borough', 'Borough Market', 'market', 51.5055, -0.091, 'London', 4.6, 40_000, ['market']),
  e('w-ldn-london-eye', 'London Eye', 'attraction', 51.5033, -0.1196, 'London', 4.5, 100_000, ['famous']),
  e('w-ldn-buckingham', 'Buckingham Palace', 'attraction', 51.5014, -0.1419, 'London', 4.5, 90_000, ['famous']),
  e('w-ldn-covent', 'Covent Garden', 'shopping', 51.5117, -0.123, 'London', 4.6, 50_000, ['shopping']),
  e('w-ldn-shoreditch', 'Shoreditch Street Art', 'attraction', 51.525, -0.077, 'London', 4.5, 12_000, ['underrated', 'local']),
  e('w-ams-canal', 'Amsterdam Canal Ring', 'attraction', 52.3676, 4.9041, 'Amsterdam', 4.7, 60_000, ['famous']),
  e('w-ams-rijks', 'Rijksmuseum', 'museum', 52.36, 4.8852, 'Amsterdam', 4.7, 50_000, ['famous']),
  e('w-ams-anne', 'Anne Frank House', 'museum', 52.3752, 4.884, 'Amsterdam', 4.6, 45_000, ['famous']),
  e('w-ams-vondel', 'Vondelpark', 'park', 52.3579, 4.8686, 'Amsterdam', 4.6, 30_000, ['park']),
  e('w-berlin-brandenburg', 'Brandenburg Gate', 'attraction', 52.5163, 13.3777, 'Berlin', 4.7, 80_000, ['famous']),
  e('w-berlin-wall', 'East Side Gallery', 'attraction', 52.505, 13.4397, 'Berlin', 4.6, 40_000, ['famous']),
  e('w-berlin-museum', 'Museum Island', 'museum', 52.5169, 13.401, 'Berlin', 4.7, 35_000, ['famous']),
  e('w-prague-charles', 'Charles Bridge', 'attraction', 50.0865, 14.4114, 'Prague', 4.7, 70_000, ['famous']),
  e('w-prague-castle', 'Prague Castle', 'attraction', 50.091, 14.401, 'Prague', 4.7, 60_000, ['famous']),
  e('w-vienna-schonbrunn', 'Schönbrunn Palace', 'attraction', 48.1845, 16.3122, 'Vienna', 4.7, 55_000, ['famous']),
  e('w-vienna-ststephen', "St. Stephen's Cathedral", 'temple', 48.2085, 16.3731, 'Vienna', 4.7, 40_000, ['famous']),

  // ——— Europe · South ———
  e('w-rome-colosseum', 'Colosseum', 'attraction', 41.8902, 12.4922, 'Rome', 4.7, 200_000, ['famous']),
  e('w-rome-vatican', "St. Peter's Basilica", 'temple', 41.9022, 12.4539, 'Vatican City', 4.8, 120_000, ['famous']),
  e('w-rome-trevi', 'Trevi Fountain', 'attraction', 41.9009, 12.4833, 'Rome', 4.7, 100_000, ['famous']),
  e('w-rome-pantheon', 'Pantheon', 'attraction', 41.8986, 12.4769, 'Rome', 4.8, 80_000, ['famous']),
  e('w-rome-trastevere', 'Trastevere', 'attraction', 41.8897, 12.469, 'Rome', 4.6, 30_000, ['local', 'nightlife']),
  e('w-rome-trattoria', 'Trattoria Da Enzo', 'restaurant', 41.888, 12.469, 'Rome', 4.5, 8_000, ['italian']),
  e('w-florence-duomo', 'Florence Cathedral (Duomo)', 'temple', 43.7731, 11.2556, 'Florence', 4.8, 90_000, ['famous']),
  e('w-florence-uffizi', 'Uffizi Gallery', 'museum', 43.7677, 11.2553, 'Florence', 4.7, 50_000, ['famous']),
  e('w-venice-sanmarco', 'Piazza San Marco', 'attraction', 45.4341, 12.3388, 'Venice', 4.7, 80_000, ['famous']),
  e('w-venice-rialto', 'Rialto Bridge', 'attraction', 45.438, 12.3358, 'Venice', 4.6, 60_000, ['famous']),
  e('w-bcn-sagrada', 'Sagrada Família', 'attraction', 41.4036, 2.1744, 'Barcelona', 4.7, 180_000, ['famous']),
  e('w-bcn-park', 'Park Güell', 'park', 41.4145, 2.1527, 'Barcelona', 4.5, 90_000, ['famous']),
  e('w-bcn-ramblas', 'La Rambla', 'attraction', 41.381, 2.173, 'Barcelona', 4.4, 70_000, ['famous']),
  e('w-bcn-boqueria', 'La Boqueria Market', 'market', 41.3816, 2.1719, 'Barcelona', 4.5, 40_000, ['market']),
  e('w-bcn-barceloneta', 'Barceloneta Beach', 'beach', 41.3785, 2.1925, 'Barcelona', 4.4, 35_000, ['beach']),
  e('w-bcn-bunkers', 'Bunkers del Carmel', 'viewpoint', 41.4194, 2.1606, 'Barcelona', 4.6, 15_000, ['underrated', 'viewpoint']),
  e('w-bcn-tapas', 'Ciutat Comtal Tapas', 'restaurant', 41.392, 2.163, 'Barcelona', 4.4, 10_000, ['tapas']),
  e('w-madrid-prado', 'Museo del Prado', 'museum', 40.4138, -3.6921, 'Madrid, Spain', 4.7, 60_000, ['famous']),
  e('w-madrid-retiro', 'Retiro Park', 'park', 40.4153, -3.6844, 'Madrid, Spain', 4.7, 50_000, ['park', 'famous']),
  e('w-madrid-royal', 'Royal Palace of Madrid', 'attraction', 40.418, -3.7142, 'Madrid, Spain', 4.7, 55_000, ['famous', 'palace']),
  e('w-madrid-plaza-mayor', 'Plaza Mayor', 'attraction', 40.4155, -3.7074, 'Madrid, Spain', 4.6, 45_000, ['famous']),
  e('w-madrid-reina', 'Museo Reina Sofía', 'museum', 40.408, -3.6944, 'Madrid, Spain', 4.7, 40_000, ['famous', 'museum']),
  e('w-madrid-templo', 'Temple of Debod', 'attraction', 40.424, -3.7178, 'Madrid, Spain', 4.6, 25_000, ['underrated', 'viewpoint']),
  e('w-toledo-alcazar', 'Alcázar of Toledo', 'attraction', 39.8589, -4.0206, 'Toledo, Castile-La Mancha, Spain', 4.7, 35_000, ['famous', 'castle']),
  e('w-toledo-cathedral', 'Toledo Cathedral', 'temple', 39.8571, -4.0236, 'Toledo, Castile-La Mancha, Spain', 4.8, 40_000, ['famous']),
  e('w-toledo-oldtown', 'Toledo Historic Centre', 'attraction', 39.8623, -4.0273, 'Toledo, Castile-La Mancha, Spain', 4.7, 30_000, ['famous', 'unesco']),
  e('w-toledo-synagogue', 'Synagogue of Santa María la Blanca', 'attraction', 39.8558, -4.0303, 'Toledo, Castile-La Mancha, Spain', 4.6, 12_000, ['historic', 'underrated']),
  e('w-consuegra-mills', 'Consuegra Windmills', 'attraction', 39.4594, -3.6086, 'Consuegra, Castile-La Mancha, Spain', 4.7, 18_000, ['famous', 'viewpoint']),
  e('w-cabaneros', 'Cabañeros National Park', 'park', 39.396, -4.487, 'Castile-La Mancha, Spain', 4.6, 8_000, ['nature', 'famous', 'park']),
  e('w-tablas-daimiel', 'Tablas de Daimiel National Park', 'park', 39.141, -3.697, 'Ciudad Real, Castile-La Mancha, Spain', 4.6, 7_500, ['nature', 'park', 'underrated']),
  e('w-ruidera', 'Lagunas de Ruidera', 'lake', 38.966, -2.89, 'Ciudad Real, Castile-La Mancha, Spain', 4.7, 12_000, ['nature', 'lake', 'famous']),
  e('w-almagro-plaza', 'Plaza Mayor de Almagro', 'attraction', 38.888, -3.712, 'Almagro, Castile-La Mancha, Spain', 4.6, 6_000, ['historic', 'local']),
  e('w-calatrava', 'Castillo de Calatrava la Nueva', 'attraction', 38.666, -3.841, 'Ciudad Real, Castile-La Mancha, Spain', 4.6, 4_500, ['castle', 'historic', 'underrated']),
  e('w-ciudad-real-cathedral', 'Ciudad Real Cathedral', 'temple', 38.986, -3.929, 'Ciudad Real, Castile-La Mancha, Spain', 4.5, 3_800, ['historic', 'local']),
  e('w-seville-alcazar', 'Real Alcázar of Seville', 'attraction', 37.383, -5.9914, 'Seville, Spain', 4.8, 70_000, ['famous', 'palace']),
  e('w-seville-cathedral', 'Seville Cathedral & Giralda', 'temple', 37.3858, -5.993, 'Seville, Spain', 4.8, 65_000, ['famous']),
  e('w-seville-plazaespana', 'Plaza de España', 'attraction', 37.3772, -5.9869, 'Seville, Spain', 4.8, 55_000, ['famous']),
  e('w-granada-alhambra', 'Alhambra', 'attraction', 37.1773, -3.5986, 'Granada, Spain', 4.8, 120_000, ['famous', 'unesco']),
  e('w-valencia-arts', 'City of Arts and Sciences', 'attraction', 39.4542, -0.3528, 'Valencia, Spain', 4.7, 50_000, ['famous']),
  e('w-valencia-oldtown', 'Valencia Old Town / Cathedral', 'attraction', 39.4753, -0.375, 'Valencia, Spain', 4.6, 30_000, ['famous']),
  e('w-athens-acropolis', 'Acropolis of Athens', 'attraction', 37.9715, 23.7267, 'Athens', 4.7, 100_000, ['famous']),
  e('w-athens-plaka', 'Plaka', 'attraction', 37.972, 23.73, 'Athens', 4.5, 30_000, ['local']),
  e('w-istanbul-hagia', 'Hagia Sophia', 'attraction', 41.0086, 28.9802, 'Istanbul', 4.7, 90_000, ['famous']),
  e('w-istanbul-blue', 'Blue Mosque', 'temple', 41.0054, 28.9768, 'Istanbul', 4.7, 80_000, ['famous']),
  e('w-istanbul-grand', 'Grand Bazaar', 'market', 41.0106, 28.968, 'Istanbul', 4.4, 60_000, ['market']),
  e('w-istanbul-bosphorus', 'Bosphorus Cruise viewpoint', 'viewpoint', 41.039, 29.0, 'Istanbul', 4.6, 25_000, ['viewpoint']),

  // ——— Americas ———
  e('w-nyc-central', 'Central Park', 'park', 40.7829, -73.9654, 'New York', 4.8, 200_000, ['famous']),
  e('w-nyc-liberty', 'Statue of Liberty', 'attraction', 40.6892, -74.0445, 'New York', 4.7, 150_000, ['famous']),
  e('w-nyc-times', 'Times Square', 'attraction', 40.758, -73.9855, 'New York', 4.6, 180_000, ['famous']),
  e('w-nyc-empire', 'Empire State Building', 'attraction', 40.7484, -73.9857, 'New York', 4.7, 120_000, ['famous']),
  e('w-nyc-brooklyn', 'Brooklyn Bridge', 'attraction', 40.7061, -73.9969, 'New York', 4.8, 90_000, ['famous']),
  e('w-nyc-met', 'The Metropolitan Museum of Art', 'museum', 40.7794, -73.9632, 'New York', 4.8, 100_000, ['famous']),
  e('w-nyc-highline', 'The High Line', 'park', 40.748, -74.0048, 'New York', 4.7, 50_000, ['underrated', 'park']),
  e('w-nyc-pizza', "Joe's Pizza", 'restaurant', 40.7306, -74.0021, 'New York', 4.4, 12_000, ['pizza']),
  e('w-sf-golden', 'Golden Gate Bridge', 'attraction', 37.8199, -122.4783, 'San Francisco', 4.8, 150_000, ['famous']),
  e('w-sf-alcatraz', 'Alcatraz Island', 'attraction', 37.8267, -122.423, 'San Francisco', 4.7, 70_000, ['famous']),
  e('w-sf-fisherman', "Fisherman's Wharf", 'attraction', 37.808, -122.4177, 'San Francisco', 4.4, 50_000, ['famous']),
  e('w-la-hollywood', 'Hollywood Walk of Fame', 'attraction', 34.1016, -118.3269, 'Los Angeles', 4.3, 80_000, ['famous']),
  e('w-la-santa', 'Santa Monica Pier', 'attraction', 34.0094, -118.497, 'Los Angeles', 4.5, 60_000, ['famous']),
  e('w-la-getty', 'The Getty Center', 'museum', 34.078, -118.474, 'Los Angeles', 4.8, 40_000, ['underrated', 'museum']),
  e('w-chicago-bean', 'Cloud Gate (The Bean)', 'attraction', 41.8827, -87.6233, 'Chicago', 4.7, 70_000, ['famous']),
  e('w-chicago-navy', 'Navy Pier', 'attraction', 41.8917, -87.6086, 'Chicago', 4.4, 40_000, ['famous']),
  e('w-toronto-cn', 'CN Tower', 'attraction', 43.6426, -79.3871, 'Toronto', 4.6, 60_000, ['famous']),
  e('w-vancouver-stanley', 'Stanley Park', 'park', 49.3017, -123.1417, 'Vancouver', 4.8, 50_000, ['famous', 'park']),
  e('w-mexico-zocalo', 'Zócalo', 'attraction', 19.4326, -99.1332, 'Mexico City', 4.6, 40_000, ['famous']),
  e('w-mexico-anthropology', 'National Museum of Anthropology', 'museum', 19.426, -99.186, 'Mexico City', 4.8, 30_000, ['famous']),
  e('w-rio-christ', 'Christ the Redeemer', 'attraction', -22.9519, -43.2105, 'Rio de Janeiro', 4.7, 100_000, ['famous']),
  e('w-rio-copacabana', 'Copacabana Beach', 'beach', -22.9711, -43.1822, 'Rio de Janeiro', 4.6, 70_000, ['famous', 'beach']),
  e('w-machu', 'Machu Picchu', 'attraction', -13.1631, -72.545, 'Peru', 4.8, 90_000, ['famous', 'unesco']),

  // ——— Middle East / Africa / Oceania ———
  e('w-dxb-burj', 'Burj Khalifa', 'attraction', 25.1972, 55.2744, 'Dubai', 4.7, 150_000, ['famous']),
  e('w-dxb-mall', 'The Dubai Mall', 'mall', 25.1985, 55.2796, 'Dubai', 4.6, 100_000, ['famous', 'mall']),
  e('w-dxb-palm', 'Palm Jumeirah', 'attraction', 25.1124, 55.139, 'Dubai', 4.5, 50_000, ['famous']),
  e('w-dxb-spice', 'Al Fahidi Historic District', 'attraction', 25.2631, 55.2972, 'Dubai', 4.5, 20_000, ['underrated', 'historic']),
  e('w-dxb-desert', 'Desert Safari meetup (Al Qudra area)', 'attraction', 24.85, 55.3, 'Dubai', 4.5, 25_000, ['desert']),
  e('w-abu-sheikh', 'Sheikh Zayed Grand Mosque', 'temple', 24.4128, 54.475, 'Abu Dhabi', 4.9, 80_000, ['famous']),
  e('w-cairo-pyramids', 'Giza Pyramids', 'attraction', 29.9792, 31.1342, 'Cairo', 4.7, 120_000, ['famous']),
  e('w-cairo-museum', 'Egyptian Museum', 'museum', 30.0478, 31.2336, 'Cairo', 4.6, 40_000, ['famous']),
  e('w-marrakech-jamaa', 'Jemaa el-Fnaa', 'market', 31.6258, -7.9891, 'Marrakech', 4.5, 50_000, ['famous', 'market']),
  e('w-capetown-table', 'Table Mountain', 'viewpoint', -33.9628, 18.4098, 'Cape Town', 4.8, 70_000, ['famous']),
  e('w-capetown-waterfront', 'V&A Waterfront', 'shopping', -33.9036, 18.420, 'Cape Town', 4.5, 40_000, ['shopping']),
  e('w-syd-opera', 'Sydney Opera House', 'attraction', -33.8568, 151.2153, 'Sydney', 4.7, 90_000, ['famous']),
  e('w-syd-bridge', 'Sydney Harbour Bridge', 'attraction', -33.8523, 151.2108, 'Sydney', 4.7, 50_000, ['famous']),
  e('w-syd-bondi', 'Bondi Beach', 'beach', -33.8915, 151.2767, 'Sydney', 4.6, 40_000, ['famous', 'beach']),
  e('w-syd-manly', 'Manly Beach', 'beach', -33.7969, 151.284, 'Sydney', 4.6, 20_000, ['underrated', 'beach']),
  e('w-mel-laneways', 'Melbourne Laneways', 'attraction', -37.8136, 144.9631, 'Melbourne', 4.6, 30_000, ['local', 'cafe']),
  e('w-mel-royal', 'Royal Botanic Gardens Victoria', 'park', -37.8304, 144.9796, 'Melbourne', 4.7, 25_000, ['park']),
  e('w-auckland-sky', 'Sky Tower Auckland', 'attraction', -36.8485, 174.762, 'Auckland', 4.5, 25_000, ['famous']),
  e('w-queenstown-remarkables', 'The Remarkables viewpoint', 'viewpoint', -45.07, 168.75, 'Queenstown', 4.8, 20_000, ['famous', 'nature']),
];

const ATTRACTION = new Set<PlaceCategory>([
  'attraction',
  'mall',
  'park',
  'museum',
  'temple',
  'market',
  'viewpoint',
  'zoo',
  'shopping',
  'beach',
  'hot_spring',
  'cold_spring',
  'spring',
  'lake',
  'river',
  'resort',
  'nightlife',
]);
const FOOD = new Set<PlaceCategory>(['restaurant', 'cafe', 'nightlife']);

function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6_371_000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function toPlace(entry: WorldEntry, origin: GeoPoint): Place {
  return {
    id: entry.id,
    provider: 'world-catalog',
    providerPlaceId: entry.id,
    name: entry.name,
    category: entry.category,
    latitude: entry.latitude,
    longitude: entry.longitude,
    address: entry.address,
    rating: entry.rating,
    reviewCount: entry.reviewCount,
    tags: entry.tags,
    photos: entry.photoUrl ? [entry.photoUrl] : undefined,
    distanceMeters: Math.round(
      haversineMeters(origin, { latitude: entry.latitude, longitude: entry.longitude }),
    ),
  };
}

export function getWorldNearbyPlaces(params: {
  location: GeoPoint;
  category: 'attraction' | 'restaurant';
  radiusMeters?: number;
  limit?: number;
}): Place[] {
  const limit = Math.min(Math.max(params.limit ?? 24, 1), 100);
  const match =
    params.category === 'restaurant'
      ? (entry: WorldEntry) => FOOD.has(entry.category)
      : (entry: WorldEntry) => ATTRACTION.has(entry.category);

  const start = params.radiusMeters ?? 40_000;
  const places = WORLD.filter(match)
    .map((entry) => toPlace(entry, params.location))
    .filter((place) => (place.distanceMeters ?? 0) <= start);
  return sortPlacesByCategoryPopularity(places, params.category).slice(0, limit);
}

/** Total curated entries (for tests / diagnostics). */
export function getWorldCatalogSize(): number {
  return WORLD.length;
}
