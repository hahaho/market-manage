package cn.lmjia.market.core.service;


import cn.lmjia.market.core.entity.Login;
import cn.lmjia.market.core.entity.MainGood;
import cn.lmjia.market.core.entity.MainOrder;
import cn.lmjia.market.core.entity.MainProduct;
import cn.lmjia.market.core.entity.support.OrderStatus;
import cn.lmjia.market.core.exception.MainGoodLowStockException;
import me.jiangcai.jpa.entity.support.Address;
import me.jiangcai.logistics.LogisticsSupplier;
import me.jiangcai.logistics.entity.Depot;
import me.jiangcai.logistics.entity.Product;
import me.jiangcai.logistics.entity.StockShiftUnit;
import me.jiangcai.logistics.event.InstallationEvent;
import me.jiangcai.logistics.event.ShiftEvent;
import me.jiangcai.wx.model.Gender;
import org.springframework.context.event.EventListener;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.transaction.annotation.Transactional;

import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.Path;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * @author CJ
 */
public interface MainOrderService {

    /**
     * 新创建订单
     *
     * @param who                创建者，也将是支付者
     * @param recommendBy        推荐人，必有的
     * @param name               客户
     * @param mobile             客户手机
     * @param age                年龄
     * @param gender             性别
     * @param installAddress     安装地址
     * @param amounts            不可以包含数量0的商品！
     * @param mortgageIdentifier 可选的按揭识别码
     * @return 新创建的订单
     */
    @Transactional
    MainOrder newOrder(Login who, Login recommendBy, String name, String mobile, int age, Gender gender
            , Address installAddress
            , Map<MainGood, Integer> amounts, String mortgageIdentifier) throws MainGoodLowStockException;

    /**
     * 给所有未支付的订单添加 Executor，如果想 {@message market.core.service.order.maxMinuteForPay} 实时生效，可以调这个方法
     */
    @Transactional
    void createExecutorToForPayOrder();

    /**
     * @return 所有订单
     */
    @Transactional(readOnly = true)
    List<MainOrder> allOrders();

    /**
     * @param id 订单id
     * @return 获取订单，never null
     */
    @Transactional(readOnly = true)
    MainOrder getOrder(long id);

    /**
     * @param orderId {@link MainOrder#getSerialId(Path, CriteriaBuilder)}
     * @return 获取订单，never null
     */
    @Transactional(readOnly = true)
    MainOrder getOrder(String orderId);

    /**
     * @param id 订单id
     * @return 订单是否已支付
     */
    @Transactional(readOnly = true)
    boolean isPaySuccess(long id);

    /**
     * @param order 订单
     * @return 享受该订单受益者
     */
    @Transactional(readOnly = true)
    Login getEnjoyability(MainOrder order);

    /**
     * @param orderBy 下单人
     * @return 如果该人下单则何人获得收益
     */
    @Transactional(readOnly = true)
    Login getEnjoyability(Login orderBy);

    /**
     * @param orderId   可选订单号
     * @param mobile    可选购买者手机号码
     * @param goodId    可选商品
     * @param orderDate 可选下单日期
     * @param status    可选状态；如果为{@link OrderStatus#EMPTY}表示所有
     * @return 获取数据规格
     */
    Specification<MainOrder> search(String orderId, String mobile, Long goodId, LocalDate orderDate, OrderStatus status);

    /**
     * 全文搜索
     *
     * @param search 可选的搜索字段
     * @param status 可选状态；如果为{@link OrderStatus#EMPTY}表示所有
     * @return 获取数据规格
     */
    Specification<MainOrder> search(String search, OrderStatus status);

    @Transactional
    void updateOrderTime(LocalDateTime time);

    /**
     * @param orderId 订单号
     * @return 这个订单需要的库存信息
     */
    @Transactional(readOnly = true)
    List<Depot> depotsForOrder(long orderId);

    /**
     * 物流开动
     *
     * @param supplierType 物流类型
     * @param orderId      订单号
     * @param depotId      仓库号
     * @return 相关信息
     */
    @Transactional
    StockShiftUnit makeLogistics(Class<? extends LogisticsSupplier> supplierType, long orderId, long depotId);

    @EventListener(ShiftEvent.class)
    @Transactional
    void forShiftEvent(ShiftEvent event);

    @EventListener(InstallationEvent.class)
    @Transactional
    void forInstallationEvent(InstallationEvent event);

    /**
     * 指定货品冻结库存：订单状态为{未支付，未发货}的订单货品数
     *
     * @param product 指定货品
     * @return 货品冻结库存
     */
    @Transactional(readOnly = true)
    int sumProductNum(Product product);

    /**
     * 指定条件的订单货品总数：订单状态为{未支付，未发货}的订单货品数
     *
     * @param product       指定货品
     * @param beginTime     订单区间起始时间，包含
     * @param endTime       订单区间结束时间，包含
     * @param orderStatuses 订单指定状态
     * @return 订单货品总数
     */
    @Transactional(readOnly = true)
    int sumProductNum(Product product, LocalDateTime beginTime, LocalDateTime endTime, OrderStatus... orderStatuses);

    /**
     * 计算今日可销售库存 = 今日核算时间开始时的可用库存 / 计划售罄天数 - 今日销售数量
     *
     * @param product 主要货品
     * @return 限购库存
     */
    @Transactional(readOnly = true)
    int limitStock(Product product);

    /**
     * 计算指定货品的可销售库存 = 今日限购库存 - 今日订单库存
     *
     * @param product 指定货品
     * @return 可用库存
     */
    @Transactional(readOnly = true)
    int usableStock(Product product);

    /**
     * 对货品的库存赋值
     *
     * @param mainGoodSet 商品列表
     */
    @Transactional(readOnly = true)
    void calculateGoodStock(Collection<MainGood> mainGoodSet);


}
